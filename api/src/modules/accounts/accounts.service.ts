import { AppDataSource } from '../../config/data-source';
import { withTransaction } from '../../common/transaction';
import { AccountEntity } from './data_access/account.entity';
import { AccountEntryEntity } from './data_access/account-entry.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { AccountEvents } from './accounts.events';
import { logger } from '../../common/logger';

const accountRepo = AppDataSource.getRepository(AccountEntity);
const entryRepo = AppDataSource.getRepository(AccountEntryEntity);

export async function findAllCustomerAccounts(search?: string) {
  const qb = accountRepo.createQueryBuilder('a')
    .leftJoin('customers', 'c', 'c.id::text = a.entity_id')
    .addSelect("COALESCE(c.commercial_name, c.legal_name)", 'customerName')
    .addSelect('c.channel', 'channel')
    .addSelect('c.tax_condition', 'taxCondition')
    .where("a.entity_type = 'customer'");

  if (search) {
    qb.andWhere('(c.legal_name ILIKE :s OR c.commercial_name ILIKE :s)', { s: `%${search}%` });
  }

  qb.orderBy('a.current_balance', 'DESC');

  const { entities, raw } = await qb.getRawAndEntities();
  return entities.map((e, i) => ({
    ...e,
    customerName: raw[i]?.customerName ?? null,
    channel: raw[i]?.channel ?? null,
    taxCondition: raw[i]?.taxCondition ?? null,
  }));
}

export async function findByEntity(entityType: string, entityId: string) {
  let account = await accountRepo.findOne({
    where: { entityType, entityId },
  });
  if (!account) {
    account = accountRepo.create({ entityType, entityId });
    account = await accountRepo.save(account);
  }
  return account;
}

export async function findAccountById(accountId: string) {
  const account = await accountRepo.findOne({ where: { id: accountId } });
  if (!account) throw new NotFoundError('Cuenta no encontrada');
  return account;
}

const ENTRY_COLUMNS: ColumnMap = {
  type:          { type: 'enum',   column: 'type' },
  status:        { type: 'enum',   column: 'status' },
  referenceType: { type: 'enum',   column: 'referenceType' },
  referenceId:   { type: 'string', column: 'referenceId' },
  concept:       { type: 'string', column: 'concept' },
  amount:        { type: 'number', column: 'amount' },
  date:          { type: 'date',   column: 'date' },
  createdAt:     { type: 'date',   column: 'createdAt' },
};

const ENTRY_SORTABLE: SortableMap = {
  date:             'e.date',
  amount:           'e.amount',
  resultingBalance: 'e.resultingBalance',
  status:           'e.status',
  type:             'e.type',
  createdAt:        'e.createdAt',
};

const ENTRY_SEARCH = ['e.concept', 'e.reference_type', 'e.reference_id'];

export async function getEntries(accountId: string, req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = entryRepo.createQueryBuilder('e').where('e.account_id = :accountId', { accountId });

  query.applyTo(qb, 'e', ENTRY_COLUMNS, ENTRY_SORTABLE, ENTRY_SEARCH, {
    field: 'date', direction: 'DESC',
  });

  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findEntriesSummary(accountId: string, req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = entryRepo.createQueryBuilder('e')
    .where('e.account_id = :accountId', { accountId })
    .select('COUNT(e.id)', 'total')
    .addSelect("COALESCE(SUM(CASE WHEN e.type = 'debit'  THEN e.amount ELSE 0 END), 0)", 'debitAmount')
    .addSelect("COALESCE(SUM(CASE WHEN e.type = 'credit' THEN e.amount ELSE 0 END), 0)", 'creditAmount');
  query.applyFilters(qb, 'e', ENTRY_COLUMNS, ENTRY_SEARCH);
  const row = await qb.getRawOne();
  return {
    total: Number(row?.total ?? 0),
    debitAmount: Number(row?.debitAmount ?? 0),
    creditAmount: Number(row?.creditAmount ?? 0),
  };
}

interface CreateEntryInput {
  accountId?: string;
  entityType?: string;
  entityId?: string;
  type: string;
  concept: string;
  amount: number;
  referenceType?: string;
  referenceId?: string;
}

export async function createEntry(data: CreateEntryInput) {
  const saved = await withTransaction(async (em) => {
    const accountTx = em.getRepository(AccountEntity);
    const entryTx = em.getRepository(AccountEntryEntity);

    let account: AccountEntity | null;
    if (data.accountId) {
      account = await accountTx
        .createQueryBuilder('a')
        .setLock('pessimistic_write')
        .where('a.id = :id', { id: data.accountId })
        .getOne();
      if (!account) throw new NotFoundError('Cuenta no encontrada');
    } else {
      account = await accountTx
        .createQueryBuilder('a')
        .setLock('pessimistic_write')
        .where('a.entity_type = :type AND a.entity_id = :id', {
          type: data.entityType,
          id: data.entityId,
        })
        .getOne();
      if (!account) {
        // Create then re-lock; unique(entityType, entityId) prevents dupes.
        const created = accountTx.create({ entityType: data.entityType, entityId: data.entityId });
        account = await accountTx.save(created);
      }
    }

    const currentBalance = Number(account.currentBalance);
    const amount = Number(data.amount);
    const resultingBalance = data.type === 'debit'
      ? currentBalance + amount
      : currentBalance - amount;

    const entry = entryTx.create({
      accountId: account.id,
      type: data.type,
      concept: data.concept,
      amount: data.amount,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      resultingBalance,
    });
    const savedEntry = await entryTx.save(entry);

    account.currentBalance = resultingBalance as any;
    await accountTx.save(account);

    return savedEntry;
  });

  logger.info({ action: 'create', accountId: saved.accountId, entryId: saved.id, type: saved.type, amount: saved.amount }, 'Account entry created');
  eventBus.emit(AccountEvents.ENTRY_CREATED, saved);
  return saved;
}

/**
 * Idempotent: if an entry with the same (referenceType, referenceId) already exists
 * for this entity, return it without creating a duplicate. Used by listeners that
 * react to events that may fire more than once.
 */
export async function createEntryIdempotent(
  data: CreateEntryInput & { referenceType: string; referenceId: string },
): Promise<AccountEntryEntity> {
  const account = await findByEntity(data.entityType!, data.entityId!);
  const existing = await entryRepo.findOne({
    where: {
      accountId: account.id,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      type: data.type,
    },
  });
  if (existing) return existing;
  return createEntry({ ...data, accountId: account.id });
}

export async function settleEntry(entryId: string, amount: number) {
  const entry = await entryRepo.findOne({ where: { id: entryId } });
  if (!entry) throw new NotFoundError('Asiento contable no encontrado');

  const entryAmount = Number(entry.amount);
  const settleAmount = Number(amount);

  const from = entry.status;
  if (settleAmount >= entryAmount) {
    entry.status = 'settled';
  } else {
    entry.status = 'partially_settled';
  }

  const saved = await entryRepo.save(entry);
  logger.info({ action: 'transition', accountId: saved.accountId, entryId: saved.id, from, to: saved.status }, 'Account entry settled');
  eventBus.emit(AccountEvents.ENTRY_SETTLED, saved);
  return saved;
}
