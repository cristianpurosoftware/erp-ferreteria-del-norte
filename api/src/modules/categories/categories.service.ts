import { AppDataSource } from '../../config/data-source';
import { CategoryEntity } from './data_access/category.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { CategoryEvents } from './categories.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(CategoryEntity);

const CAT_COLUMNS: ColumnMap = {
  status:     { type: 'enum',   column: 'status' },
  parentId:   { type: 'enum',   column: 'parentId' },
  name:       { type: 'string', column: 'name' },
  parentName: { type: 'string', sql: 'p.name' },
};
const CAT_SORTABLE: SortableMap = {
  name:       'c.name',
  status:     'c.status',
  createdAt:  'c.createdAt',
  parentName: 'p.name',
};

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('c')
    .leftJoin('categories', 'p', 'p.id = c.parent_id')
    .addSelect('p.name', 'parentName');
  query.applyTo(qb, 'c', CAT_COLUMNS, CAT_SORTABLE, ['c.name'], {
    field: 'name', direction: 'ASC',
  });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    parentName: raw[i]?.parentName ?? null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id }, relations: ['children'] });
  if (!item) throw new NotFoundError('Categoría no encontrada');
  return item;
}

export async function create(data: Partial<CategoryEntity>) {
  const item = repo.create(data);
  const saved = await repo.save(item);
  eventBus.emit(CategoryEvents.CREATED, saved);
  logger.info({ action: 'create', categoryId: saved.id, name: saved.name, parentId: saved.parentId ?? null }, 'Category created');
  return saved;
}

export async function update(id: string, data: Partial<CategoryEntity>) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(CategoryEvents.UPDATED, saved);
  logger.info({ action: 'update', categoryId: id }, 'Category updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  eventBus.emit(CategoryEvents.DELETED, { id });
  logger.info({ action: 'delete', categoryId: id }, 'Category deleted');
}
