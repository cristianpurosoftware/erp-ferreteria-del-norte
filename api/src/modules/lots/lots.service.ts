import { AppDataSource } from '../../config/data-source';
import { LotEntity } from './data_access/lot.entity';
import { StockByLotEntity } from './data_access/stock-by-lot.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { LotEvents } from './lots.events';
import { logger } from '../../common/logger';

const lotRepo = AppDataSource.getRepository(LotEntity);
const stockByLotRepo = AppDataSource.getRepository(StockByLotEntity);

const TRANSITIONS: TransitionMap<string> = {
  active: ['blocked', 'expired', 'consumed'],
  blocked: ['active', 'expired'],
  expired: [],
  consumed: [],
};

const LOT_COLUMNS: ColumnMap = {
  status:         { type: 'enum',   column: 'status' },
  productId:      { type: 'enum',   column: 'productId' },
  supplierId:     { type: 'enum',   column: 'supplierId' },
  code:           { type: 'string', column: 'code' },
  expirationDate: { type: 'date',   column: 'expirationDate' },
  manufactureDate:{ type: 'date',   column: 'manufactureDate' },
  receivedAt:     { type: 'date',   column: 'receivedAt' },
  productName:    { type: 'string', sql: 'p.name' },
  productSku:     { type: 'string', sql: 'p.sku' },
};
const LOT_SORTABLE: SortableMap = {
  expirationDate: 'l.expirationDate', manufactureDate: 'l.manufactureDate',
  code: 'l.code', status: 'l.status', createdAt: 'l.createdAt',
  productName: 'p.name',
};
const LOT_SEARCH = ['l.code', 'p.name', 'p.sku'];

function buildLotsQB() {
  return lotRepo.createQueryBuilder('l')
    .leftJoin('products', 'p', 'p.id::text = l.product_id::text')
    .leftJoin('suppliers', 's', 's.id::text = l.supplier_id::text');
}

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildLotsQB()
    .addSelect('p.name', 'productName')
    .addSelect('p.sku', 'productSku')
    .addSelect('s.name', 'supplierName');
  query.applyTo(qb, 'l', LOT_COLUMNS, LOT_SORTABLE, LOT_SEARCH, {
    field: 'expirationDate', direction: 'ASC',
  });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    productName: raw[i]?.productName ?? null,
    productSku: raw[i]?.productSku ?? null,
    supplierName: raw[i]?.supplierName ?? null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function findSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildLotsQB().select('COUNT(l.id)', 'total');
  query.applyFilters(qb, 'l', LOT_COLUMNS, LOT_SEARCH);
  const row = await qb.getRawOne();

  const byStatusQb = buildLotsQB()
    .select('l.status', 'status')
    .addSelect('COUNT(l.id)', 'count')
    .groupBy('l.status');
  query.applyFilters(byStatusQb, 'l', LOT_COLUMNS, LOT_SEARCH);
  const byStatusRows = await byStatusQb.getRawMany();

  return {
    total: Number(row?.total ?? 0),
    byStatus: byStatusRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = Number(r.count); return acc;
    }, {}),
  };
}

export async function findById(id: string) {
  const item = await lotRepo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Lote no encontrado');
  return item;
}

export async function findOrCreate(productId: string, code: string, extra: Partial<LotEntity> = {}) {
  let lot = await lotRepo.findOne({ where: { productId, code } });
  if (!lot) {
    lot = await lotRepo.save(lotRepo.create({ productId, code, ...extra, status: 'active' }));
    eventBus.emit(LotEvents.CREATED, lot);
    logger.info({ action: 'create', lotId: lot.id, productId, code }, 'Lot auto-created via findOrCreate');
  }
  return lot;
}

export async function create(data: any) {
  const existing = await lotRepo.findOne({ where: { productId: data.productId, code: data.code } });
  if (existing) throw new BusinessLogicError('DUPLICATE_LOT', 'Ya existe un lote con ese código para este producto');
  const saved = await lotRepo.save(lotRepo.create({ ...data, status: 'active' })) as unknown as LotEntity;
  eventBus.emit(LotEvents.CREATED, saved);
  logger.info({ action: 'create', lotId: saved.id, productId: saved.productId, code: saved.code, supplierId: saved.supplierId, expirationDate: saved.expirationDate }, 'Lot created');
  return saved;
}

async function transitionTo(id: string, newStatus: string, event: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'lot');
  item.status = newStatus;
  const saved = await lotRepo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', lotId: id, from, to: newStatus }, 'Lot status updated');
  return saved;
}

export async function block(id: string) {
  return transitionTo(id, 'blocked', LotEvents.BLOCKED);
}

export async function unblock(id: string) {
  return transitionTo(id, 'active', LotEvents.UNBLOCKED);
}

export async function markExpired(id: string) {
  return transitionTo(id, 'expired', LotEvents.EXPIRED);
}

export async function findExpiring(daysAhead = 30) {
  const end = new Date();
  end.setDate(end.getDate() + daysAhead);
  const endStr = end.toISOString().slice(0, 10);
  return lotRepo.createQueryBuilder('l')
    .where(`l.status = 'active'`)
    .andWhere('l.expiration_date IS NOT NULL')
    .andWhere('l.expiration_date <= :end', { end: endStr })
    .orderBy('l.expiration_date', 'ASC')
    .getMany();
}

export async function expireDueLots() {
  const today = new Date().toISOString().slice(0, 10);
  const due = await lotRepo.createQueryBuilder('l')
    .where(`l.status = 'active'`)
    .andWhere('l.expiration_date IS NOT NULL')
    .andWhere('l.expiration_date < :today', { today })
    .getMany();

  for (const lot of due) {
    lot.status = 'expired';
    await lotRepo.save(lot);
    eventBus.emit(LotEvents.EXPIRED, lot);
  }
  if (due.length > 0) {
    logger.info({ action: 'transition', count: due.length, from: 'active', to: 'expired' }, 'Lots expired by scheduled job');
  }
  return due.length;
}

// Stock by lot helpers

export async function findOrCreateStockByLot(
  productId: string,
  lotId: string,
  warehouseId: string,
  locationId: string | null = null,
): Promise<StockByLotEntity> {
  const where: any = { productId, lotId, warehouseId };
  where.locationId = locationId ?? undefined;
  let row = await stockByLotRepo.findOne({ where });
  if (!row) {
    row = stockByLotRepo.create({
      productId,
      lotId,
      warehouseId,
      locationId: locationId ?? undefined,
      qty: 0,
    });
    row = await stockByLotRepo.save(row);
  }
  return row;
}

export async function adjustStockByLot(
  productId: string,
  lotId: string,
  warehouseId: string,
  locationId: string | null,
  delta: number,
) {
  const row = await findOrCreateStockByLot(productId, lotId, warehouseId, locationId);
  row.qty = Number(row.qty) + Number(delta);
  await stockByLotRepo.save(row);
  return row;
}

export async function getAvailableByLotFEFO(productId: string, warehouseId: string) {
  return stockByLotRepo.createQueryBuilder('sbl')
    .leftJoin('lots', 'l', 'l.id = sbl.lot_id')
    .where('sbl.product_id = :p', { p: productId })
    .andWhere('sbl.warehouse_id = :w', { w: warehouseId })
    .andWhere(`l.status = 'active'`)
    .andWhere('sbl.qty > 0')
    .orderBy('l.expiration_date', 'ASC', 'NULLS LAST')
    .getMany();
}

export async function listStockByLot(filters: { productId?: string; warehouseId?: string }) {
  const qb = stockByLotRepo.createQueryBuilder('sbl');
  if (filters.productId) qb.andWhere('sbl.product_id = :p', { p: filters.productId });
  if (filters.warehouseId) qb.andWhere('sbl.warehouse_id = :w', { w: filters.warehouseId });
  return qb.getMany();
}
