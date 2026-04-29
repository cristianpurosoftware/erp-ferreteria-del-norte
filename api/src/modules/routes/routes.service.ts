import { AppDataSource } from '../../config/data-source';
import { RouteEntity } from './data_access/route.entity';
import { RouteVisitEntity } from './data_access/route-visit.entity';
import { CustomerVisitEntity } from './data_access/customer-visit.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { RouteEvents } from './routes.events';
import { logger } from '../../common/logger';

const routeRepo = AppDataSource.getRepository(RouteEntity);
const visitRepo = AppDataSource.getRepository(RouteVisitEntity);
const custVisitRepo = AppDataSource.getRepository(CustomerVisitEntity);

const ROUTE_COLUMNS: ColumnMap = {
  status:    { type: 'enum',   column: 'status' },
  zoneId:    { type: 'enum',   column: 'zoneId' },
  frequency: { type: 'enum',   column: 'frequency' },
  code:      { type: 'string', column: 'code' },
  name:      { type: 'string', column: 'name' },
  zoneName:  { type: 'string', sql: 'sz.name' },
};
const ROUTE_SORTABLE: SortableMap = {
  code:      'r.code',
  name:      'r.name',
  status:    'r.status',
  createdAt: 'r.createdAt',
  zoneName:  'sz.name',
};
const ROUTE_SEARCH = ['r.code', 'r.name', 'sz.name'];

function buildRouteQB() {
  return routeRepo.createQueryBuilder('r')
    .leftJoin('sales_zones', 'sz', 'sz.id::text = r.zone_id::text')
    .addSelect('sz.name', 'zoneName');
}

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildRouteQB();
  query.applyTo(qb, 'r', ROUTE_COLUMNS, ROUTE_SORTABLE, ROUTE_SEARCH, {
    field: 'code', direction: 'ASC',
  });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({ ...e, zoneName: raw[i]?.zoneName ?? null }));
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await routeRepo.findOne({ where: { id }, relations: ['visits'] });
  if (!item) throw new NotFoundError('Ruta no encontrada');
  const rows: { name: string }[] = await AppDataSource.query(
    `SELECT name FROM sales_zones WHERE id::text = $1 AND deleted_at IS NULL LIMIT 1`,
    [item.zoneId],
  );
  return { ...item, zoneName: rows[0]?.name ?? null };
}

export async function create(data: any) {
  const existing = await routeRepo.findOne({ where: { code: data.code } });
  if (existing) throw new BusinessLogicError('DUPLICATE_CODE', 'Ya existe una ruta con ese código');
  const item = routeRepo.create({ ...data } as RouteEntity);
  const saved = await routeRepo.save(item);
  eventBus.emit(RouteEvents.CREATED, saved);
  logger.info({ action: 'create', routeId: saved.id, code: saved.code, name: saved.name }, 'Route created');
  return saved;
}

export async function update(id: string, data: any) {
  const item = await routeRepo.findOne({ where: { id }, relations: ['visits'] });
  if (!item) throw new NotFoundError('Ruta no encontrada');
  Object.assign(item, data);
  const saved = await routeRepo.save(item);
  eventBus.emit(RouteEvents.UPDATED, saved);
  logger.info({ action: 'update', routeId: id }, 'Route updated');
  return saved;
}

export async function remove(id: string) {
  const item = await routeRepo.findOne({ where: { id }, relations: ['visits'] });
  if (!item) throw new NotFoundError('Ruta no encontrada');
  await routeRepo.softRemove(item);
  eventBus.emit(RouteEvents.DELETED, { id });
  logger.info({ action: 'delete', routeId: id }, 'Route deleted');
  return { id };
}

export async function addVisit(routeId: string, data: any) {
  await findById(routeId);
  const visit = visitRepo.create({ ...data, routeId } as RouteVisitEntity);
  const saved = await visitRepo.save(visit);
  eventBus.emit(RouteEvents.VISIT_PLANNED, saved);
  logger.info({ action: 'create', routeId, visitId: saved.id }, 'Route visit added');
  return saved;
}

export async function removeVisit(routeId: string, visitId: string) {
  const visit = await visitRepo.findOne({ where: { id: visitId, routeId } });
  if (!visit) throw new NotFoundError('Visita de ruta no encontrada');
  await visitRepo.softRemove(visit);
  eventBus.emit(RouteEvents.VISIT_REMOVED, { id: visitId, routeId });
  logger.info({ action: 'delete', routeId, visitId }, 'Route visit removed');
  return { id: visitId };
}

export async function listVisits(routeId: string) {
  await findById(routeId);
  return visitRepo.find({ where: { routeId }, order: { sequence: 'ASC' } });
}

// Customer-visit log (distinct from planned route_visits)

export async function createCustomerVisit(data: any) {
  const visit = custVisitRepo.create(data);
  const saved = await custVisitRepo.save(visit);
  eventBus.emit(RouteEvents.CUSTOMER_VISIT_LOGGED, saved);
  return saved;
}

const CV_COLUMNS: ColumnMap = {
  customerId: { type: 'enum', column: 'customerId' },
  routeId:    { type: 'enum', column: 'routeId' },
  sellerId:   { type: 'enum', column: 'sellerId' },
  result:     { type: 'enum', column: 'result' },
  visitedAt:  { type: 'date', column: 'visitedAt' },
};
const CV_SORTABLE: SortableMap = ['visitedAt', 'result', 'createdAt'];

export async function findCustomerVisits(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = custVisitRepo.createQueryBuilder('cv');
  query.applyTo(qb, 'cv', CV_COLUMNS, CV_SORTABLE, [], {
    field: 'visitedAt', direction: 'DESC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}
