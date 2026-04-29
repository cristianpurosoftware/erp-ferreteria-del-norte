import { AppDataSource } from '../../config/data-source';
import { TaxEntity } from './data_access/tax.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { TaxEvents } from './taxes.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(TaxEntity);

const TAX_COLUMNS: ColumnMap = {
  name: { type: 'string', column: 'name' },
  rate: { type: 'number', column: 'rate' },
};
const TAX_SORTABLE: SortableMap = ['name', 'rate', 'createdAt'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('t');
  query.applyTo(qb, 't', TAX_COLUMNS, TAX_SORTABLE, ['name'], {
    field: 'name', direction: 'ASC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOneBy({ id });
  if (!item) throw new NotFoundError('Impuesto no encontrado');
  return item;
}

export async function create(data: Partial<TaxEntity>) {
  const item = repo.create(data);
  const saved = await repo.save(item);
  eventBus.emit(TaxEvents.CREATED, saved);
  logger.info({ action: 'create', taxId: saved.id, name: saved.name, rate: saved.rate }, 'Tax created');
  return saved;
}

export async function update(id: string, data: Partial<TaxEntity>) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(TaxEvents.UPDATED, saved);
  logger.info({ action: 'update', taxId: id }, 'Tax updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  eventBus.emit(TaxEvents.DELETED, { id });
  logger.info({ action: 'delete', taxId: id }, 'Tax deleted');
}
