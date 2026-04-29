import { AppDataSource } from '../../config/data-source';
import { PaymentMethodEntity } from './data_access/payment-method.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { PaymentMethodEvents } from './payment-methods.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(PaymentMethodEntity);

const PM_COLUMNS: ColumnMap = {
  status: { type: 'enum', column: 'status' },
  code:   { type: 'string', column: 'code' },
  name:   { type: 'string', column: 'name' },
};
const PM_SORTABLE: SortableMap = ['name', 'code', 'status', 'createdAt'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('pm');
  query.applyTo(qb, 'pm', PM_COLUMNS, PM_SORTABLE, ['name', 'code'], {
    field: 'name', direction: 'ASC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOneBy({ id });
  if (!item) throw new NotFoundError('Método de pago no encontrado');
  return item;
}

export async function create(data: Partial<PaymentMethodEntity>) {
  const item = repo.create(data);
  const saved = await repo.save(item);
  eventBus.emit(PaymentMethodEvents.CREATED, saved);
  logger.info({ action: 'create', paymentMethodId: saved.id, code: saved.code, name: saved.name }, 'Payment method created');
  return saved;
}

export async function update(id: string, data: Partial<PaymentMethodEntity>) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(PaymentMethodEvents.UPDATED, saved);
  logger.info({ action: 'update', paymentMethodId: id }, 'Payment method updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  eventBus.emit(PaymentMethodEvents.DELETED, { id });
  logger.info({ action: 'delete', paymentMethodId: id }, 'Payment method deleted');
}
