import { AppDataSource } from '../../config/data-source';
import { VehicleEntity } from './data_access/vehicle.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { VehicleEvents } from './vehicles.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(VehicleEntity);

const VEHICLE_COLUMNS: ColumnMap = {
  status: { type: 'enum',   column: 'status' },
  plate:  { type: 'string', column: 'plate' },
  model:  { type: 'string', column: 'model' },
};
const VEHICLE_SORTABLE: SortableMap = ['plate', 'model', 'status', 'createdAt'];
const VEHICLE_SEARCH = ['plate', 'model'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('v');
  query.applyTo(qb, 'v', VEHICLE_COLUMNS, VEHICLE_SORTABLE, VEHICLE_SEARCH, {
    field: 'plate', direction: 'ASC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Vehículo no encontrado');
  return item;
}

export async function create(data: any) {
  const existing = await repo.findOne({ where: { plate: data.plate } });
  if (existing) throw new BusinessLogicError('DUPLICATE_PLATE', 'Ya existe un vehículo con esa patente');
  const item = repo.create(data as VehicleEntity);
  const saved = await repo.save(item);
  eventBus.emit(VehicleEvents.CREATED, saved);
  logger.info({ action: 'create', vehicleId: saved.id, plate: saved.plate, model: saved.model }, 'Vehicle created');
  return saved;
}

export async function update(id: string, data: any) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(VehicleEvents.UPDATED, saved);
  logger.info({ action: 'update', vehicleId: id }, 'Vehicle updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  eventBus.emit(VehicleEvents.DELETED, { id });
  logger.info({ action: 'delete', vehicleId: id }, 'Vehicle deleted');
  return { id };
}
