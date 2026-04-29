import { AppDataSource } from '../../config/data-source';
import { SalesZoneEntity } from './data_access/sales-zone.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { SalesZoneEvents } from './sales-zones.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(SalesZoneEntity);

const ZONE_COLUMNS: ColumnMap = {
  status:       { type: 'enum',   column: 'status' },
  parentZoneId: { type: 'enum',   column: 'parentZoneId' },
  code:         { type: 'string', column: 'code' },
  name:         { type: 'string', column: 'name' },
};
const ZONE_SORTABLE: SortableMap = ['code', 'name', 'status', 'createdAt'];
const ZONE_SEARCH = ['code', 'name'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('z');
  query.applyTo(qb, 'z', ZONE_COLUMNS, ZONE_SORTABLE, ZONE_SEARCH, {
    field: 'code', direction: 'ASC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Zona de ventas no encontrada');
  return item;
}

export async function create(data: any) {
  const existing = await repo.findOne({ where: { code: data.code } });
  if (existing) throw new BusinessLogicError('DUPLICATE_CODE', 'Ya existe una zona de ventas con ese código');

  const item = repo.create({ ...data } as SalesZoneEntity);
  const saved = await repo.save(item);
  eventBus.emit(SalesZoneEvents.CREATED, saved);
  logger.info({ action: 'create', salesZoneId: saved.id, code: saved.code, name: saved.name }, 'Sales zone created');
  return saved;
}

export async function update(id: string, data: any) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(SalesZoneEvents.UPDATED, saved);
  logger.info({ action: 'update', salesZoneId: id }, 'Sales zone updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  eventBus.emit(SalesZoneEvents.DELETED, { id });
  logger.info({ action: 'delete', salesZoneId: id }, 'Sales zone deleted');
  return { id };
}
