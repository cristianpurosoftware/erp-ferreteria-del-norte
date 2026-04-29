import { AppDataSource } from '../../config/data-source';
import { BankAccountEntity } from './data_access/bank-account.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { BankAccountEvents } from './bank-accounts.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(BankAccountEntity);

const BA_COLUMNS: ColumnMap = {
  status:   { type: 'enum',   column: 'status' },
  currency: { type: 'enum',   column: 'currency' },
  name:     { type: 'string', column: 'name' },
  bankName: { type: 'string', column: 'bankName' },
};
const BA_SORTABLE: SortableMap = ['name', 'bankName', 'currency', 'status', 'createdAt'];
const BA_SEARCH = ['name', 'bank_name', 'cbu', 'alias', 'account_number'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('b');
  query.applyTo(qb, 'b', BA_COLUMNS, BA_SORTABLE, BA_SEARCH, {
    field: 'name', direction: 'ASC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Cuenta bancaria no encontrada');
  return item;
}

export async function create(data: any) {
  const entity = repo.create(data as BankAccountEntity);
  const saved = await repo.save(entity);
  eventBus.emit(BankAccountEvents.CREATED, saved);
  logger.info({ action: 'create', bankAccountId: saved.id, name: saved.name, currency: saved.currency }, 'Bank account created');
  return saved;
}

export async function update(id: string, data: any) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(BankAccountEvents.UPDATED, saved);
  logger.info({ action: 'update', bankAccountId: id }, 'Bank account updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  logger.info({ action: 'delete', bankAccountId: id }, 'Bank account deleted');
  return { id };
}
