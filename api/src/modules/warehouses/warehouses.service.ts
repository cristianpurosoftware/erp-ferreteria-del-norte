import { AppDataSource } from '../../config/data-source';
import { WarehouseEntity } from './data_access/warehouse.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { WarehouseEvents } from './warehouses.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(WarehouseEntity);

const WH_COLUMNS: ColumnMap = {
  status:     { type: 'enum',   column: 'status' },
  type:       { type: 'enum',   column: 'type' },
  branchId:   { type: 'enum',   column: 'branchId' },
  name:       { type: 'string', column: 'name' },
  branchName: { type: 'string', sql: 'b.name' },
};
const WH_SORTABLE: SortableMap = {
  name:       'w.name',
  status:     'w.status',
  type:       'w.type',
  createdAt:  'w.createdAt',
  branchName: 'b.name',
};

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('w')
    .leftJoin('branches', 'b', 'b.id::text = w.branch_id')
    .addSelect('b.name', 'branchName');
  query.applyTo(qb, 'w', WH_COLUMNS, WH_SORTABLE, ['w.name'], {
    field: 'name', direction: 'ASC',
  });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    branchName: raw[i]?.branchName ?? null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOneBy({ id });
  if (!item) throw new NotFoundError('Depósito no encontrado');
  return item;
}

export async function create(data: Partial<WarehouseEntity>) {
  const item = repo.create(data);
  const saved = await repo.save(item);
  eventBus.emit(WarehouseEvents.CREATED, saved);
  logger.info({ action: 'create', warehouseId: saved.id, name: saved.name, type: saved.type, branchId: saved.branchId }, 'Warehouse created');
  return saved;
}

export async function update(id: string, data: Partial<WarehouseEntity>) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(WarehouseEvents.UPDATED, saved);
  logger.info({ action: 'update', warehouseId: id }, 'Warehouse updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  eventBus.emit(WarehouseEvents.DELETED, { id });
  logger.info({ action: 'delete', warehouseId: id }, 'Warehouse deleted');
}
