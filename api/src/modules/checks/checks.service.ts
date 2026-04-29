import { AppDataSource } from '../../config/data-source';
import { CheckEntity } from './data_access/check.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { CheckEvents } from './checks.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(CheckEntity);

const TRANSITIONS: TransitionMap<string> = {
  received: ['in_portfolio', 'deposited', 'endorsed', 'returned_to_customer', 'cancelled'],
  in_portfolio: ['deposited', 'endorsed', 'returned_to_customer', 'cancelled'],
  deposited: ['cleared', 'bounced'],
  cleared: [],
  bounced: [],
  endorsed: ['returned_to_customer'],
  returned_to_customer: [],
  cancelled: [],
};

const CHECK_COLUMNS: ColumnMap = {
  status:     { type: 'enum',   column: 'status' },
  kind:       { type: 'enum',   column: 'kind' },
  ownOrThird: { type: 'enum',   column: 'ownOrThird' },
  amount:     { type: 'number', column: 'amount' },
  dueDate:    { type: 'date',   column: 'dueDate' },
  issueDate:  { type: 'date',   column: 'issueDate' },
  number:     { type: 'string', column: 'number' },
  bankName:   { type: 'string', column: 'bankName' },
  customerName:    { type: 'string', sql: 'cu.legal_name' },
  supplierName:    { type: 'string', sql: 'su.name' },
  bankAccountName: { type: 'string', sql: 'ba.name' },
};
const CHECK_SORTABLE: SortableMap = {
  dueDate: 'c.dueDate', issueDate: 'c.issueDate', amount: 'c.amount',
  status: 'c.status', createdAt: 'c.createdAt', number: 'c.number',
};
const CHECK_SEARCH = ['c.number', 'c.bank_name', 'c.account_holder', 'cu.legal_name', 'su.name'];

function buildChecksQB() {
  return repo.createQueryBuilder('c')
    .leftJoin('customers', 'cu', 'cu.id::text = c.received_from_customer_id::text')
    .leftJoin('suppliers', 'su', 'su.id::text = c.endorsed_to_supplier_id::text')
    .leftJoin('bank_accounts', 'ba', 'ba.id::text = c.bank_account_id::text');
}

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildChecksQB()
    .addSelect('cu.legal_name', 'customerName')
    .addSelect('su.name', 'supplierName')
    .addSelect('ba.name', 'bankAccountName');

  query.applyTo(qb, 'c', CHECK_COLUMNS, CHECK_SORTABLE, CHECK_SEARCH, {
    field: 'dueDate', direction: 'ASC',
  });

  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    customerName: raw[i]?.customerName ?? null,
    supplierName: raw[i]?.supplierName ?? null,
    bankAccountName: raw[i]?.bankAccountName ?? null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function findSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildChecksQB()
    .select('COUNT(c.id)', 'total')
    .addSelect('COALESCE(SUM(c.amount), 0)', 'totalAmount');
  query.applyFilters(qb, 'c', CHECK_COLUMNS, CHECK_SEARCH);
  const row = await qb.getRawOne();
  return {
    total: Number(row?.total ?? 0),
    totalAmount: Number(row?.totalAmount ?? 0),
  };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Cheque no encontrado');
  return item;
}

export async function create(data: any) {
  const entity = repo.create({ ...data, status: 'received' } as CheckEntity);
  const saved = await repo.save(entity);
  eventBus.emit(CheckEvents.RECEIVED, saved);
  logger.info({ action: 'create', checkId: saved.id, amount: saved.amount, number: saved.number, kind: saved.kind }, 'Check created');
  return saved;
}

async function transitionTo(id: string, newStatus: string, event: string, patch: Partial<CheckEntity> = {}) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'check');
  item.status = newStatus;
  Object.assign(item, patch);
  const saved = await repo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', checkId: id, from, to: newStatus }, 'Check status updated');
  return saved;
}

export async function deposit(id: string, bankAccountId: string) {
  return transitionTo(id, 'deposited', CheckEvents.DEPOSITED, { depositedAt: new Date(), bankAccountId });
}

export async function clear(id: string) {
  return transitionTo(id, 'cleared', CheckEvents.CLEARED, { clearedAt: new Date() });
}

export async function bounce(id: string, reason: string) {
  return transitionTo(id, 'bounced', CheckEvents.BOUNCED, { bouncedAt: new Date(), bounceReason: reason });
}

export async function endorse(id: string, supplierId: string) {
  return transitionTo(id, 'endorsed', CheckEvents.ENDORSED, { endorsedToSupplierId: supplierId });
}

export async function returnToCustomer(id: string) {
  return transitionTo(id, 'returned_to_customer', CheckEvents.RETURNED);
}

export async function cancel(id: string) {
  return transitionTo(id, 'cancelled', CheckEvents.CANCELLED);
}

export async function findPortfolio() {
  return repo.find({ where: [{ status: 'received' }, { status: 'in_portfolio' }] });
}
