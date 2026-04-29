import { AppDataSource } from '../../config/data-source';
import { BrandEntity } from './data_access/brand.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { BrandEvents } from './brands.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(BrandEntity);

const BRAND_COLUMNS: ColumnMap = {
  status: { type: 'enum',   column: 'status' },
  name:   { type: 'string', column: 'name' },
};
const BRAND_SORTABLE: SortableMap = ['name', 'status', 'createdAt'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('b');
  query.applyTo(qb, 'b', BRAND_COLUMNS, BRAND_SORTABLE, ['name'], {
    field: 'name', direction: 'ASC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOneBy({ id });
  if (!item) throw new NotFoundError('Marca no encontrada');
  return item;
}

export async function create(data: Partial<BrandEntity>) {
  const item = repo.create(data);
  const saved = await repo.save(item);
  eventBus.emit(BrandEvents.CREATED, saved);
  logger.info({ action: 'create', brandId: saved.id, name: saved.name }, 'Brand created');
  return saved;
}

export async function update(id: string, data: Partial<BrandEntity>) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(BrandEvents.UPDATED, saved);
  logger.info({ action: 'update', brandId: id }, 'Brand updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  eventBus.emit(BrandEvents.DELETED, { id });
  logger.info({ action: 'delete', brandId: id }, 'Brand deleted');
}
