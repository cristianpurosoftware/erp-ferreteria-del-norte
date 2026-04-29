import { AppDataSource } from '../../config/data-source';
import { InventoryCountEntity } from './data_access/inventory-count.entity';
import { InventoryCountLineEntity } from './data_access/inventory-count-line.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { InventoryCountEvents } from './inventory-counts.events';
import { createMovement } from '../inventory/inventory.service';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(InventoryCountEntity);
const lineRepo = AppDataSource.getRepository(InventoryCountLineEntity);

const TRANSITIONS: TransitionMap<string> = {
  draft: ['in_progress', 'cancelled'],
  in_progress: ['counted', 'cancelled'],
  counted: ['approved', 'cancelled'],
  approved: ['applied', 'cancelled'],
  applied: [],
  cancelled: [],
};

const IC_COLUMNS: ColumnMap = {
  status:      { type: 'enum',   column: 'status' },
  kind:        { type: 'enum',   column: 'kind' },
  warehouseId: { type: 'enum',   column: 'warehouseId' },
  createdAt:   { type: 'date',   column: 'createdAt' },
  warehouseName: { type: 'string', sql: 'w.name' },
};
const IC_SORTABLE: SortableMap = {
  createdAt: 'c.createdAt', status: 'c.status', kind: 'c.kind',
  warehouseName: 'w.name',
};
const IC_SEARCH = ['w.name'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('c')
    .leftJoin('warehouses', 'w', 'w.id::text = c.warehouse_id::text')
    .addSelect('w.name', 'warehouseName');
  query.applyTo(qb, 'c', IC_COLUMNS, IC_SORTABLE, IC_SEARCH, {
    field: 'createdAt', direction: 'DESC',
  });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({ ...e, warehouseName: raw[i]?.warehouseName ?? null }));
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const qb = repo.createQueryBuilder('c')
    .leftJoin('warehouses', 'w', 'w.id::text = c.warehouse_id::text')
    .addSelect('w.name', 'warehouseName')
    .where('c.id = :id', { id });
  const { entities, raw } = await qb.getRawAndEntities();
  const entity = entities[0];
  if (!entity) throw new NotFoundError('Conteo de inventario no encontrado');
  const row = raw[0];

  const lines = await lineRepo.find({ where: { inventoryCountId: id } });

  const productIds = [...new Set(lines.map((l) => l.productId).filter(Boolean))];
  const lotIds = [...new Set(lines.map((l) => l.lotId).filter(Boolean) as string[])];
  const locationIds = [...new Set(lines.map((l) => l.locationId).filter(Boolean) as string[])];

  const [products, lots, locations] = await Promise.all([
    productIds.length
      ? AppDataSource.query(
          `SELECT id::text AS id, name FROM products WHERE id::text = ANY($1) AND deleted_at IS NULL`,
          [productIds],
        )
      : Promise.resolve([]),
    lotIds.length
      ? AppDataSource.query(
          `SELECT id::text AS id, code FROM lots WHERE id::text = ANY($1) AND deleted_at IS NULL`,
          [lotIds],
        )
      : Promise.resolve([]),
    locationIds.length
      ? AppDataSource.query(
          `SELECT id::text AS id, code FROM warehouse_locations WHERE id::text = ANY($1) AND deleted_at IS NULL`,
          [locationIds],
        )
      : Promise.resolve([]),
  ]);
  const productMap = new Map<string, string>(products.map((p: { id: string; name: string }) => [p.id, p.name]));
  const lotMap = new Map<string, string>(lots.map((l: { id: string; code: string }) => [l.id, l.code]));
  const locationMap = new Map<string, string>(locations.map((l: { id: string; code: string }) => [l.id, l.code]));

  const enrichedLines = lines.map((l) => ({
    ...l,
    productName: productMap.get(l.productId) ?? null,
    lotCode: l.lotId ? (lotMap.get(l.lotId) ?? null) : null,
    locationCode: l.locationId ? (locationMap.get(l.locationId) ?? null) : null,
  }));

  return {
    ...entity,
    lines: enrichedLines,
    warehouseName: row?.warehouseName ?? null,
  };
}

// Creates a fresh count in draft status using the current stock of the
// original count's warehouse. Only includes active, non-deleted products
// with positive stock. Lot/location granularity comes from stock_by_lot
// when available; products without lot tracking get a single summary line
// from stock.available_qty. The original count is not modified.
export async function recreateFromStock(id: string) {
  const original = await findById(id);

  const stockByLot: any[] = await AppDataSource.query(
    `SELECT sbl.product_id::text AS "productId",
            sbl.lot_id::text      AS "lotId",
            sbl.location_id::text AS "locationId",
            sbl.qty::numeric      AS "qty"
     FROM stock_by_lot sbl
     INNER JOIN products p ON p.id::text = sbl.product_id::text
     WHERE sbl.warehouse_id::text = $1
       AND sbl.qty > 0
       AND p.deleted_at IS NULL
       AND p.status = 'active'`,
    [original.warehouseId],
  );

  const productsWithLots = new Set<string>(stockByLot.map((r) => r.productId));

  const stockAll: any[] = await AppDataSource.query(
    `SELECT s.product_id::text      AS "productId",
            s.available_qty::numeric AS "qty"
     FROM stock s
     INNER JOIN products p ON p.id::text = s.product_id::text
     WHERE s.warehouse_id::text = $1
       AND s.available_qty > 0
       AND p.deleted_at IS NULL
       AND p.status = 'active'`,
    [original.warehouseId],
  );
  const stockOnly = stockAll.filter((r) => !productsWithLots.has(r.productId));

  const newCount = repo.create({
    warehouseId: original.warehouseId,
    kind: original.kind,
    scope: original.scope ?? undefined,
    status: 'draft',
    metadata: {
      ...((original as { metadata?: Record<string, unknown> }).metadata ?? {}),
      recreatedFromInventoryCountId: original.id,
    },
  });

  const lines: InventoryCountLineEntity[] = [
    ...stockByLot.map((row) =>
      lineRepo.create({
        productId: row.productId,
        lotId: row.lotId ?? undefined,
        locationId: row.locationId ?? undefined,
        systemQty: Number(row.qty),
      }),
    ),
    ...stockOnly.map((row) =>
      lineRepo.create({
        productId: row.productId,
        systemQty: Number(row.qty),
      }),
    ),
  ];
  newCount.lines = lines;

  const saved = await repo.save(newCount);
  eventBus.emit(InventoryCountEvents.CREATED, saved);
  logger.info({ action: 'create', inventoryCountId: saved.id, warehouseId: saved.warehouseId, kind: saved.kind, lineCount: lines.length }, 'Inventory count recreated from stock');
  return saved;
}

export async function create(data: any) {
  const saved = await repo.save(repo.create({
    warehouseId: data.warehouseId,
    kind: data.kind ?? 'cycle',
    scope: data.scope ?? null,
    status: 'draft',
  }));
  eventBus.emit(InventoryCountEvents.CREATED, saved);
  logger.info({ action: 'create', inventoryCountId: saved.id, warehouseId: saved.warehouseId, kind: saved.kind }, 'Inventory count created');
  return saved;
}

async function transitionTo(id: string, newStatus: string, event: string, patch: Partial<InventoryCountEntity> = {}) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'inventory_count');
  item.status = newStatus;
  Object.assign(item, patch);
  const saved = await repo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', inventoryCountId: id, from, to: newStatus }, 'Inventory count status updated');
  return saved;
}

export async function start(id: string) {
  return transitionTo(id, 'in_progress', InventoryCountEvents.STARTED, { startedAt: new Date() });
}

export async function finish(id: string) {
  return transitionTo(id, 'counted', InventoryCountEvents.COUNTED);
}

export async function addLines(id: string, data: any) {
  const count = await findById(id);
  for (const l of data.lines) {
    const diff = l.countedQty !== undefined && l.systemQty !== undefined
      ? Number(l.countedQty) - Number(l.systemQty)
      : null;
    const line = lineRepo.create({
      inventoryCountId: count.id,
      productId: l.productId,
      lotId: l.lotId,
      locationId: l.locationId,
      systemQty: l.systemQty ?? 0,
      countedQty: l.countedQty,
      difference: diff ?? undefined,
      reasonCode: l.reasonCode,
    });
    const saved = await lineRepo.save(line);
    eventBus.emit(InventoryCountEvents.LINE_RECORDED, saved);
  }
  logger.info({ action: 'update', inventoryCountId: id, lineCount: data.lines.length }, 'Inventory count lines added');
  return findById(id);
}

export async function approve(id: string, userId?: string) {
  return transitionTo(id, 'approved', InventoryCountEvents.APPROVED, { approvedBy: userId, approvedAt: new Date() });
}

export async function apply(id: string) {
  const count = await findById(id);
  if (count.status !== 'approved') {
    return transitionTo(id, 'applied', InventoryCountEvents.APPLIED);
  }

  // Emit adjustment movements for each line with a non-zero difference
  for (const line of count.lines) {
    const diff = Number(line.difference ?? 0);
    if (diff === 0 || line.countedQty === null) continue;
    try {
      await createMovement({
        type: 'adjustment',
        productId: line.productId,
        sourceWarehouseId: count.warehouseId,
        destWarehouseId: count.warehouseId,
        destLocationId: line.locationId ?? null,
        quantity: diff,
        reasonCode: 'count_adjust',
        lotId: line.lotId ?? null,
        referenceType: 'inventory_count',
        referenceId: count.id,
      });
    } catch (e) {
      logger.error({ err: e, inventoryCountId: count.id, lineId: line.id }, 'Adjust movement failed for count line');
    }
  }

  return transitionTo(id, 'applied', InventoryCountEvents.APPLIED);
}

export async function cancel(id: string) {
  return transitionTo(id, 'cancelled', InventoryCountEvents.CANCELLED);
}
