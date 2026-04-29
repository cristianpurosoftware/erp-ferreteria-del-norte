import { AppDataSource } from '../../config/data-source';
import { PriceListEntity } from './data_access/price-list.entity';
import { PriceListItemEntity } from './data_access/price-list-item.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { PriceListEvents } from './price-lists.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(PriceListEntity);
const itemRepo = AppDataSource.getRepository(PriceListItemEntity);

const PRICE_LIST_COLUMNS: ColumnMap = {
  status:     { type: 'enum',    column: 'status' },
  currency:   { type: 'enum',    column: 'currency' },
  isDefault:  { type: 'boolean', column: 'isDefault' },
  validFrom:  { type: 'date',    column: 'validFrom' },
  validUntil: { type: 'date',    column: 'validUntil' },
  name:       { type: 'string',  column: 'name' },
};

const PRICE_LIST_SORTABLE: SortableMap = {
  name:       'pl.name',
  createdAt:  'pl.createdAt',
  validFrom:  'pl.validFrom',
  validUntil: 'pl.validUntil',
};

const PRICE_LIST_SEARCH = ['pl.name'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('pl');
  query.applyTo(qb, 'pl', PRICE_LIST_COLUMNS, PRICE_LIST_SORTABLE, PRICE_LIST_SEARCH, {
    field: 'createdAt',
    direction: 'DESC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('pl')
    .select('COUNT(pl.id)', 'total')
    .addSelect(
      `SUM(CASE WHEN pl.status = 'active' THEN 1 ELSE 0 END)`,
      'activeCount',
    );
  query.applyFilters(qb, 'pl', PRICE_LIST_COLUMNS, PRICE_LIST_SEARCH);
  const row = await qb.getRawOne();
  return {
    total:       Number(row?.total ?? 0),
    activeCount: Number(row?.activeCount ?? 0),
  };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id }, relations: ['items'] });
  if (!item) throw new NotFoundError('Lista de precios no encontrada');
  return item;
}

export async function create(data: Partial<PriceListEntity>) {
  const item = repo.create(data);
  const saved = await repo.save(item);
  eventBus.emit(PriceListEvents.CREATED, saved);
  logger.info({ action: 'create', priceListId: saved.id, name: saved.name, currency: saved.currency, status: saved.status }, 'Price list created');
  return saved;
}

export async function update(id: string, data: Partial<PriceListEntity>) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(PriceListEvents.UPDATED, saved);
  logger.info({ action: 'update', priceListId: id }, 'Price list updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  eventBus.emit(PriceListEvents.DELETED, { id });
  logger.info({ action: 'delete', priceListId: id }, 'Price list deleted');
}

export async function addItem(priceListId: string, data: Partial<PriceListItemEntity>) {
  await findById(priceListId); // ensure price list exists
  const item = itemRepo.create({ ...data, priceListId });
  const saved = await itemRepo.save(item);
  logger.info({ action: 'create', priceListId, itemId: saved.id }, 'Price list item added');
  return saved;
}

export async function removeItem(priceListId: string, itemId: string) {
  await findById(priceListId); // ensure price list exists
  const item = await itemRepo.findOneBy({ id: itemId, priceListId });
  if (!item) throw new NotFoundError('Ítem de lista de precios no encontrado');
  await itemRepo.softRemove(item);
  logger.info({ action: 'delete', priceListId, itemId }, 'Price list item removed');
}
