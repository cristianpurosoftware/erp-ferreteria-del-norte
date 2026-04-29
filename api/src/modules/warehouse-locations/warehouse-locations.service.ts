import { AppDataSource } from '../../config/data-source';
import { WarehouseLocationEntity } from './data_access/warehouse-location.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { WarehouseLocationEvents } from './warehouse-locations.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(WarehouseLocationEntity);

const LOC_COLUMNS: ColumnMap = {
  status:        { type: 'enum',   column: 'status' },
  kind:          { type: 'enum',   column: 'kind' },
  warehouseId:   { type: 'enum',   column: 'warehouseId' },
  code:          { type: 'string', column: 'code' },
  warehouseName: { type: 'string', sql: 'w.name' },
};
const LOC_SORTABLE: SortableMap = {
  code:          'l.code',
  kind:          'l.kind',
  status:        'l.status',
  warehouseName: 'w.name',
};

function buildLocQB() {
  return repo.createQueryBuilder('l')
    .leftJoin('warehouses', 'w', 'w.id::text = l.warehouse_id::text')
    .addSelect('w.name', 'warehouseName');
}

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildLocQB();
  query.applyTo(qb, 'l', LOC_COLUMNS, LOC_SORTABLE, ['l.code', 'w.name'], {
    field: 'code', direction: 'ASC',
  });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({ ...e, warehouseName: raw[i]?.warehouseName ?? null }));
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Ubicación de depósito no encontrada');
  const rows: { name: string }[] = await AppDataSource.query(
    `SELECT name FROM warehouses WHERE id::text = $1 AND deleted_at IS NULL LIMIT 1`,
    [item.warehouseId],
  );
  return { ...item, warehouseName: rows[0]?.name ?? null };
}

export async function create(data: any) {
  const existing = await repo.findOne({ where: { warehouseId: data.warehouseId, code: data.code } });
  if (existing) throw new BusinessLogicError('DUPLICATE_CODE', 'Ya existe una ubicación con ese código en el depósito');
  const item = repo.create(data);
  const saved = await repo.save(item) as unknown as WarehouseLocationEntity;
  eventBus.emit(WarehouseLocationEvents.CREATED, saved);
  logger.info({ action: 'create', locationId: saved.id, warehouseId: saved.warehouseId, code: saved.code, kind: saved.kind }, 'Warehouse location created');
  return saved;
}

export async function update(id: string, data: any) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Ubicación de depósito no encontrada');
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(WarehouseLocationEvents.UPDATED, saved);
  logger.info({ action: 'update', locationId: id, code: saved.code, kind: saved.kind, status: saved.status }, 'Warehouse location updated');
  return saved;
}

export async function remove(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Ubicación de depósito no encontrada');
  await repo.softRemove(item);
  eventBus.emit(WarehouseLocationEvents.DELETED, { id });
  logger.info({ action: 'delete', locationId: id }, 'Warehouse location deleted');
  return { id };
}
