import { AppDataSource } from '../../config/data-source';
import { DriverEntity } from './data_access/driver.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { DriverEvents } from './drivers.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(DriverEntity);

const DRIVER_COLUMNS: ColumnMap = {
  status:   { type: 'enum',   column: 'status' },
  fullName: { type: 'string', column: 'fullName' },
  dni:      { type: 'string', column: 'dni' },
  phone:    { type: 'string', column: 'phone' },
};
const DRIVER_SORTABLE: SortableMap = ['fullName', 'dni', 'status', 'createdAt', 'licenseExpires'];
const DRIVER_SEARCH = ['full_name', 'dni', 'phone', 'license_number'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('d');
  query.applyTo(qb, 'd', DRIVER_COLUMNS, DRIVER_SORTABLE, DRIVER_SEARCH, {
    field: 'fullName', direction: 'ASC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Chofer no encontrado');
  return item;
}

export async function create(data: any) {
  const item = repo.create(data as DriverEntity);
  const saved = await repo.save(item);
  eventBus.emit(DriverEvents.CREATED, saved);
  logger.info({ action: 'create', driverId: saved.id, fullName: saved.fullName, dni: saved.dni }, 'Driver created');
  return saved;
}

export async function update(id: string, data: any) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(DriverEvents.UPDATED, saved);
  logger.info({ action: 'update', driverId: id }, 'Driver updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  eventBus.emit(DriverEvents.DELETED, { id });
  logger.info({ action: 'delete', driverId: id }, 'Driver deleted');
  return { id };
}
