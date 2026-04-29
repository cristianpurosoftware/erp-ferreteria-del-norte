import { AppDataSource } from '../../config/data-source';
import { PaymentConditionEntity } from './data_access/payment-condition.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { PaymentConditionEvents } from './payment-conditions.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(PaymentConditionEntity);

const PC_COLUMNS: ColumnMap = {
  name: { type: 'string', column: 'name' },
  days: { type: 'number', column: 'days' },
};
const PC_SORTABLE: SortableMap = ['name', 'days', 'createdAt'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('pc');
  query.applyTo(qb, 'pc', PC_COLUMNS, PC_SORTABLE, ['name'], {
    field: 'days', direction: 'ASC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOneBy({ id });
  if (!item) throw new NotFoundError('Condición de pago no encontrada');
  return item;
}

export async function create(data: Partial<PaymentConditionEntity>) {
  const item = repo.create(data);
  const saved = await repo.save(item);
  eventBus.emit(PaymentConditionEvents.CREATED, saved);
  logger.info({ action: 'create', paymentConditionId: saved.id, name: saved.name, days: saved.days }, 'PaymentCondition created');
  return saved;
}

export async function update(id: string, data: Partial<PaymentConditionEntity>) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(PaymentConditionEvents.UPDATED, saved);
  logger.info({ action: 'update', paymentConditionId: id }, 'PaymentCondition updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  eventBus.emit(PaymentConditionEvents.DELETED, { id });
  logger.info({ action: 'delete', paymentConditionId: id }, 'PaymentCondition deleted');
}
