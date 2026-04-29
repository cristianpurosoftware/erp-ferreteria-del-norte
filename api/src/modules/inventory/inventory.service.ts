import { EntityManager, Repository } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { withTransaction } from '../../common/transaction';
import { StockEntity } from './data_access/stock.entity';
import { StockMovementEntity } from './data_access/stock-movement.entity';
import { StockReservationEntity } from './data_access/stock-reservation.entity';
import { ProductEntity } from '../products/data_access/product.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { InventoryEvents } from './inventory.events';
import { adjustStockByLot, getAvailableByLotFEFO } from '../lots/lots.service';
import { logger } from '../../common/logger';

const stockRepo = AppDataSource.getRepository(StockEntity);
const movementRepo = AppDataSource.getRepository(StockMovementEntity);
const reservationRepo = AppDataSource.getRepository(StockReservationEntity);
const productRepo = AppDataSource.getRepository(ProductEntity);

async function loadStockForUpdate(
  em: EntityManager,
  productId: string,
  warehouseId: string,
  variantId: string | null,
): Promise<StockEntity> {
  const repo = em.getRepository(StockEntity);
  let stock = await repo
    .createQueryBuilder('s')
    .setLock('pessimistic_write')
    .where('s.product_id = :productId', { productId })
    .andWhere('s.warehouse_id = :warehouseId', { warehouseId })
    .andWhere(variantId === null ? 's.variant_id IS NULL' : 's.variant_id = :variantId', { variantId })
    .getOne();

  if (!stock) {
    // Create the row outside the lock then re-lock; unique constraint prevents dupes.
    try {
      stock = repo.create({
        productId,
        warehouseId,
        variantId,
        availableQty: 0,
        reservedQty: 0,
        inTransitQty: 0,
        minStock: 0,
      });
      stock = await repo.save(stock);
    } catch {
      // race: another tx created it; re-fetch with lock
      stock = await repo
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.product_id = :productId', { productId })
        .andWhere('s.warehouse_id = :warehouseId', { warehouseId })
        .andWhere(variantId === null ? 's.variant_id IS NULL' : 's.variant_id = :variantId', { variantId })
        .getOne();
      if (!stock) throw new BusinessLogicError('STOCK_RACE', 'No se pudo bloquear el registro de stock');
    }
  }
  return stock;
}

async function loadProduct(em: EntityManager | null, productId: string) {
  const repo = em ? em.getRepository(ProductEntity) : productRepo;
  return repo.findOne({ where: { id: productId } });
}

function crossedReorderPoint(product: ProductEntity | null, prevAvailable: number, newAvailable: number): boolean {
  if (!product) return false;
  const rp = Number(product.reorderPoint ?? 0);
  if (rp <= 0) return false;
  return prevAvailable > rp && newAvailable <= rp;
}

export async function getStock(filters?: { productId?: string; warehouseId?: string; lowStock?: string; search?: string }) {
  const qb = stockRepo.createQueryBuilder('s')
    .leftJoin('products', 'p', 'p.id::text = s.product_id::text')
    .leftJoin('warehouses', 'w', 'w.id::text = s.warehouse_id')
    .addSelect('p.name', 'productName')
    .addSelect('p.sku', 'productSku')
    .addSelect('w.name', 'warehouseName');

  if (filters?.productId) {
    qb.andWhere('s.product_id = :productId', { productId: filters.productId });
  }
  if (filters?.warehouseId) {
    qb.andWhere('s.warehouse_id = :warehouseId', { warehouseId: filters.warehouseId });
  }
  if (filters?.lowStock === 'true') {
    qb.andWhere('s.available_qty <= s.min_stock');
  }
  if (filters?.search) {
    qb.andWhere('(p.name ILIKE :s OR p.sku ILIKE :s)', { s: `%${filters.search}%` });
  }

  const { entities, raw } = await qb.getRawAndEntities();
  return entities.map((e, i) => ({
    ...e,
    productName: raw[i]?.productName ?? null,
    productSku: raw[i]?.productSku ?? null,
    warehouseName: raw[i]?.warehouseName ?? null,
  }));
}

const MOVEMENT_COLUMNS: ColumnMap = {
  type:              { type: 'enum',   column: 'type' },
  productId:         { type: 'enum',   column: 'productId' },
  sourceWarehouseId: { type: 'enum',   column: 'sourceWarehouseId' },
  destWarehouseId:   { type: 'enum',   column: 'destWarehouseId' },
  lotId:             { type: 'enum',   column: 'lotId' },
  date:              { type: 'date',   column: 'date' },
  createdAt:         { type: 'date',   column: 'createdAt' },
  productName:       { type: 'string', sql: 'p.name' },
  productSku:        { type: 'string', sql: 'p.sku' },
};
const MOVEMENT_SORTABLE: SortableMap = {
  date: 'm.date',
  type: 'm.type',
  quantity: 'm.quantity',
  createdAt: 'm.createdAt',
  productName: 'p.name',
};
const MOVEMENT_SEARCH = ['p.name', 'p.sku', 'm.reason', 'm.reason_code'];

export async function getMovements(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = movementRepo.createQueryBuilder('m')
    .leftJoin('products', 'p', 'p.id::text = m.product_id::text')
    .addSelect('p.name', 'productName')
    .addSelect('p.sku', 'productSku');

  query.applyTo(qb, 'm', MOVEMENT_COLUMNS, MOVEMENT_SORTABLE, MOVEMENT_SEARCH, {
    field: 'date', direction: 'DESC',
  });

  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    productName: raw[i]?.productName ?? null,
    productSku: raw[i]?.productSku ?? null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function getMovementsSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = movementRepo.createQueryBuilder('m')
    .leftJoin('products', 'p', 'p.id::text = m.product_id::text')
    .select('COUNT(m.id)', 'total')
    .addSelect('COALESCE(SUM(CASE WHEN m.type IN (\'inbound\',\'return\') THEN m.quantity ELSE 0 END), 0)', 'inbound')
    .addSelect('COALESCE(SUM(CASE WHEN m.type = \'outbound\' THEN m.quantity ELSE 0 END), 0)', 'outbound');
  query.applyFilters(qb, 'm', MOVEMENT_COLUMNS, MOVEMENT_SEARCH);
  const row = await qb.getRawOne();
  return {
    total: Number(row?.total ?? 0),
    inbound: Number(row?.inbound ?? 0),
    outbound: Number(row?.outbound ?? 0),
  };
}

interface MovementInput {
  type: 'inbound' | 'outbound' | 'adjustment' | 'transfer' | 'reservation' | 'release' | 'return';
  productId: string;
  variantId?: string | null;
  sourceWarehouseId?: string | null;
  destWarehouseId?: string | null;
  sourceLocationId?: string | null;
  destLocationId?: string | null;
  quantity: number;
  lotId?: string | null;
  reason?: string | null;
  reasonCode?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
}

interface MovementOutcome {
  movement: StockMovementEntity;
  stockBefore: number | null;
  stockAfter: number | null;
  warehouseId: string | null;
  product: ProductEntity | null;
}

async function createMovementInTx(em: EntityManager, data: MovementInput): Promise<MovementOutcome> {
  const product = await loadProduct(em, data.productId);
  if (
    product?.tracksLot &&
    !data.lotId &&
    ['inbound', 'outbound', 'adjustment', 'transfer', 'reservation', 'release', 'return'].includes(data.type)
  ) {
    throw new BusinessLogicError('LOT_REQUIRED', `El producto ${product.name} requiere un lotId para movimientos de stock`);
  }

  const movementsRepo = em.getRepository(StockMovementEntity);
  const movement = movementsRepo.create(data as Partial<StockMovementEntity>);
  const saved = await movementsRepo.save(movement);

  const variantId: string | null = data.variantId ?? null;
  const stockRepoTx: Repository<StockEntity> = em.getRepository(StockEntity);
  let stockBefore: number | null = null;
  let stockAfter: number | null = null;
  let affectedWarehouseId: string | null = null;
  const qty = Number(data.quantity);

  switch (data.type) {
    case 'inbound': {
      if (!data.destWarehouseId) throw new BusinessLogicError('INVALID_MOVEMENT', 'destWarehouseId es requerido para movimientos de entrada');
      const stock = await loadStockForUpdate(em, data.productId, data.destWarehouseId, variantId);
      stockBefore = Number(stock.availableQty);
      stock.availableQty = Number(stock.availableQty) + qty;
      stockAfter = Number(stock.availableQty);
      affectedWarehouseId = data.destWarehouseId;
      await stockRepoTx.save(stock);
      if (data.lotId) {
        await adjustStockByLot(data.productId, data.lotId, data.destWarehouseId, data.destLocationId ?? null, qty);
      }
      break;
    }
    case 'outbound': {
      if (!data.sourceWarehouseId) throw new BusinessLogicError('INVALID_MOVEMENT', 'sourceWarehouseId es requerido para movimientos de salida');
      const stock = await loadStockForUpdate(em, data.productId, data.sourceWarehouseId, variantId);
      // If the outbound consumes a previously-made reservation (referenceType=order), draw from
      // reservedQty (already deducted from available at reserve time). Otherwise direct sale: draw from available.
      const consumesReservation = data.referenceType === 'order' && !!data.referenceId;
      if (consumesReservation) {
        if (Number(stock.reservedQty) < qty) {
          throw new BusinessLogicError('INSUFFICIENT_RESERVATION', `Stock reservado (${stock.reservedQty}) es menor que la cantidad de salida (${qty})`);
        }
        stock.reservedQty = Number(stock.reservedQty) - qty;
      } else {
        if (Number(stock.availableQty) < qty) {
          throw new BusinessLogicError('INSUFFICIENT_STOCK', `Stock disponible (${stock.availableQty}) es menor que la cantidad de salida (${qty})`);
        }
        stockBefore = Number(stock.availableQty);
        stock.availableQty = Number(stock.availableQty) - qty;
        stockAfter = Number(stock.availableQty);
      }
      affectedWarehouseId = data.sourceWarehouseId;
      await stockRepoTx.save(stock);
      if (data.lotId) {
        await adjustStockByLot(data.productId, data.lotId, data.sourceWarehouseId, data.sourceLocationId ?? null, -qty);
      }
      break;
    }
    case 'adjustment': {
      const whId = data.destWarehouseId || data.sourceWarehouseId;
      if (!whId) throw new BusinessLogicError('INVALID_MOVEMENT', 'warehouseId es requerido para ajustes');
      const stock = await loadStockForUpdate(em, data.productId, whId, variantId);
      stockBefore = Number(stock.availableQty);
      stock.availableQty = Number(stock.availableQty) + qty;
      stockAfter = Number(stock.availableQty);
      affectedWarehouseId = whId;
      await stockRepoTx.save(stock);
      if (data.lotId) {
        await adjustStockByLot(data.productId, data.lotId, whId, data.destLocationId ?? data.sourceLocationId ?? null, qty);
      }
      break;
    }
    case 'transfer': {
      if (!data.sourceWarehouseId || !data.destWarehouseId) {
        throw new BusinessLogicError('INVALID_MOVEMENT', 'La transferencia requiere sourceWarehouseId y destWarehouseId');
      }
      const source = await loadStockForUpdate(em, data.productId, data.sourceWarehouseId, variantId);
      if (Number(source.availableQty) < qty) {
        throw new BusinessLogicError('INSUFFICIENT_STOCK', `El depósito origen tiene ${source.availableQty}, la transferencia requiere ${qty}`);
      }
      source.availableQty = Number(source.availableQty) - qty;
      await stockRepoTx.save(source);

      const dest = await loadStockForUpdate(em, data.productId, data.destWarehouseId, variantId);
      dest.availableQty = Number(dest.availableQty) + qty;
      await stockRepoTx.save(dest);

      if (data.lotId) {
        await adjustStockByLot(data.productId, data.lotId, data.sourceWarehouseId, data.sourceLocationId ?? null, -qty);
        await adjustStockByLot(data.productId, data.lotId, data.destWarehouseId, data.destLocationId ?? null, qty);
      }
      break;
    }
    case 'reservation': {
      const whId = data.sourceWarehouseId || data.destWarehouseId;
      if (!whId) throw new BusinessLogicError('INVALID_MOVEMENT', 'warehouseId es requerido para reservas');
      const stock = await loadStockForUpdate(em, data.productId, whId, variantId);
      if (Number(stock.availableQty) < qty) {
        throw new BusinessLogicError('INSUFFICIENT_STOCK', `Stock disponible (${stock.availableQty}) es menor que la cantidad a reservar (${qty})`);
      }
      stockBefore = Number(stock.availableQty);
      stock.availableQty = Number(stock.availableQty) - qty;
      stockAfter = Number(stock.availableQty);
      affectedWarehouseId = whId;
      stock.reservedQty = Number(stock.reservedQty) + qty;
      await stockRepoTx.save(stock);
      break;
    }
    case 'release': {
      const whId = data.sourceWarehouseId || data.destWarehouseId;
      if (!whId) throw new BusinessLogicError('INVALID_MOVEMENT', 'warehouseId es requerido para liberaciones');
      const stock = await loadStockForUpdate(em, data.productId, whId, variantId);
      stock.reservedQty = Number(stock.reservedQty) - qty;
      stock.availableQty = Number(stock.availableQty) + qty;
      await stockRepoTx.save(stock);
      break;
    }
    case 'return': {
      if (!data.destWarehouseId) throw new BusinessLogicError('INVALID_MOVEMENT', 'destWarehouseId es requerido para devoluciones');
      const stock = await loadStockForUpdate(em, data.productId, data.destWarehouseId, variantId);
      stock.availableQty = Number(stock.availableQty) + qty;
      await stockRepoTx.save(stock);
      if (data.lotId) {
        await adjustStockByLot(data.productId, data.lotId, data.destWarehouseId, data.destLocationId ?? null, qty);
      }
      break;
    }
  }

  return { movement: saved, stockBefore, stockAfter, warehouseId: affectedWarehouseId, product };
}

export async function createMovement(data: MovementInput) {
  const outcome = await withTransaction((em) => createMovementInTx(em, data));

  logger.info(
    { action: 'create', movementId: outcome.movement.id, type: data.type, quantity: data.quantity, productId: data.productId },
    'Inventory movement created',
  );

  // Side-effects after the transaction commits.
  eventBus.emit(InventoryEvents.MOVEMENT_CREATED, outcome.movement);

  if (
    outcome.stockBefore !== null &&
    outcome.stockAfter !== null &&
    crossedReorderPoint(outcome.product, outcome.stockBefore, outcome.stockAfter)
  ) {
    eventBus.emit(InventoryEvents.STOCK_LOW, {
      productId: data.productId,
      warehouseId: outcome.warehouseId,
      availableQty: outcome.stockAfter,
      reorderPoint: Number(outcome.product!.reorderPoint),
      preferredSupplierId: outcome.product!.preferredSupplierId ?? null,
      leadTimeDays: Number(outcome.product!.leadTimeDays ?? 0),
    });
  }

  return outcome.movement;
}

export async function adjustStock(data: {
  productId: string;
  variantId?: string | null;
  warehouseId: string;
  quantity: number;
  reason?: string;
  reasonCode?: string;
  lotId?: string;
  locationId?: string;
}) {
  const movement = await createMovement({
    type: 'adjustment',
    productId: data.productId,
    variantId: data.variantId ?? null,
    sourceWarehouseId: data.warehouseId,
    destWarehouseId: data.warehouseId,
    destLocationId: data.locationId ?? null,
    quantity: data.quantity,
    reason: data.reason ?? null,
    reasonCode: data.reasonCode ?? 'manual_adjust',
    lotId: data.lotId ?? null,
  });

  eventBus.emit(InventoryEvents.ADJUSTED, movement);
  return movement;
}

export async function transferStock(data: {
  productId: string;
  variantId?: string | null;
  sourceWarehouseId: string;
  destWarehouseId: string;
  quantity: number;
  lotId?: string;
  sourceLocationId?: string;
  destLocationId?: string;
}) {
  const movement = await createMovement({
    type: 'transfer',
    productId: data.productId,
    variantId: data.variantId ?? null,
    sourceWarehouseId: data.sourceWarehouseId,
    destWarehouseId: data.destWarehouseId,
    sourceLocationId: data.sourceLocationId ?? null,
    destLocationId: data.destLocationId ?? null,
    quantity: data.quantity,
    lotId: data.lotId ?? null,
    reasonCode: 'transfer',
  });

  eventBus.emit(InventoryEvents.TRANSFERRED, movement);
  return movement;
}

export async function reserveForOrder(
  orderId: string,
  items: { productId: string; variantId?: string | null; warehouseId: string; quantity: number }[],
) {
  const reservations = await withTransaction(async (em) => {
    const created: StockReservationEntity[] = [];
    const reservationRepoTx = em.getRepository(StockReservationEntity);

    for (const item of items) {
      const variantId = item.variantId ?? null;
      const product = await loadProduct(em, item.productId);

      if (product?.tracksLot) {
        // FEFO: consume oldest active lots first
        let remaining = Number(item.quantity);
        const rows = await getAvailableByLotFEFO(item.productId, item.warehouseId);
        for (const row of rows) {
          if (remaining <= 0) break;
          const take = Math.min(Number(row.qty), remaining);
          if (take <= 0) continue;

          const reservation = reservationRepoTx.create({
            orderId,
            productId: item.productId,
            variantId,
            warehouseId: item.warehouseId,
            quantity: take,
            status: 'active',
            lotId: row.lotId,
            locationId: row.locationId,
          });
          const savedReservation = await reservationRepoTx.save(reservation);
          created.push(savedReservation);

          await createMovementInTx(em, {
            type: 'reservation',
            productId: item.productId,
            variantId,
            sourceWarehouseId: item.warehouseId,
            sourceLocationId: row.locationId,
            quantity: take,
            referenceType: 'order',
            referenceId: orderId,
            lotId: row.lotId,
          });

          remaining -= take;
        }

        if (remaining > 0) {
          throw new BusinessLogicError(
            'INSUFFICIENT_LOT_STOCK',
            `Not enough lot-tracked stock for product ${product.name} in warehouse ${item.warehouseId}`,
          );
        }
      } else {
        const reservation = reservationRepoTx.create({
          orderId,
          productId: item.productId,
          variantId,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
          status: 'active',
        });
        const savedReservation = await reservationRepoTx.save(reservation);
        created.push(savedReservation);

        await createMovementInTx(em, {
          type: 'reservation',
          productId: item.productId,
          variantId,
          sourceWarehouseId: item.warehouseId,
          quantity: item.quantity,
          referenceType: 'order',
          referenceId: orderId,
        });
      }
    }
    return created;
  });

  logger.info(
    { action: 'create', orderId, reservationCount: reservations.length },
    'Stock reservations created',
  );
  eventBus.emit(InventoryEvents.RESERVED, { orderId, reservations });
  return reservations;
}

export async function releaseReservation(orderId: string) {
  const reservations = await withTransaction(async (em) => {
    const reservationRepoTx = em.getRepository(StockReservationEntity);
    const active = await reservationRepoTx.find({
      where: { orderId, status: 'active' },
    });
    if (active.length === 0) return [];

    for (const reservation of active) {
      await createMovementInTx(em, {
        type: 'release',
        productId: reservation.productId,
        variantId: reservation.variantId,
        sourceWarehouseId: reservation.warehouseId,
        sourceLocationId: reservation.locationId,
        quantity: reservation.quantity,
        referenceType: 'order',
        referenceId: orderId,
        lotId: reservation.lotId,
      });
      reservation.status = 'released';
      await reservationRepoTx.save(reservation);
    }
    return active;
  });

  if (reservations.length > 0) {
    logger.info(
      { action: 'transition', orderId, from: 'active', to: 'released', reservationCount: reservations.length },
      'Stock reservations released',
    );
    eventBus.emit(InventoryEvents.RELEASED, { orderId, reservations });
  }
  return reservations;
}

/**
 * Mark active reservations of an order as consumed once the goods have actually
 * left the warehouse. Called after order.dispatched. Idempotent: a second call
 * for the same order finds no active reservations and is a no-op.
 */
export async function markReservationsConsumed(orderId: string) {
  const consumed = await withTransaction(async (em) => {
    const reservationRepoTx = em.getRepository(StockReservationEntity);
    const active = await reservationRepoTx.find({ where: { orderId, status: 'active' } });
    for (const r of active) {
      r.status = 'consumed';
      await reservationRepoTx.save(r);
    }
    return active;
  });
  if (consumed.length > 0) {
    logger.info(
      { action: 'transition', orderId, from: 'active', to: 'consumed', reservationCount: consumed.length },
      'Stock reservations consumed',
    );
  }
  return consumed;
}
