import { AppDataSource } from '../../config/data-source';
import { InvoiceTypeEntity } from './data_access/invoice-type.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { InvoiceTypeEvents } from './invoice-types.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(InvoiceTypeEntity);

const IT_COLUMNS: ColumnMap = {
  code: { type: 'string', column: 'code' },
  name: { type: 'string', column: 'name' },
};
const IT_SORTABLE: SortableMap = ['code', 'name', 'createdAt'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('it');
  query.applyTo(qb, 'it', IT_COLUMNS, IT_SORTABLE, ['code', 'name'], {
    field: 'code', direction: 'ASC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOneBy({ id });
  if (!item) throw new NotFoundError('Tipo de comprobante no encontrado');
  return item;
}

export async function create(data: Partial<InvoiceTypeEntity>) {
  const item = repo.create(data);
  const saved = await repo.save(item);
  eventBus.emit(InvoiceTypeEvents.CREATED, saved);
  logger.info({ action: 'create', invoiceTypeId: saved.id, code: saved.code, name: saved.name }, 'InvoiceType created');
  return saved;
}

export async function update(id: string, data: Partial<InvoiceTypeEntity>) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(InvoiceTypeEvents.UPDATED, saved);
  logger.info({ action: 'update', invoiceTypeId: id }, 'InvoiceType updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  eventBus.emit(InvoiceTypeEvents.DELETED, { id });
  logger.info({ action: 'delete', invoiceTypeId: id }, 'InvoiceType deleted');
}
