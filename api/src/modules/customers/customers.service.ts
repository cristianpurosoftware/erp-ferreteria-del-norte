import { AppDataSource } from '../../config/data-source';
import { CustomerEntity } from './data_access/customer.entity';
import { AccountEntity } from '../accounts/data_access/account.entity';
import { OrderEntity } from '../orders/data_access/order.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { CustomerEvents } from './customers.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(CustomerEntity);
const accountRepo = AppDataSource.getRepository(AccountEntity);
const orderRepo = AppDataSource.getRepository(OrderEntity);

// Order statuses where the order is committed-but-not-yet-invoiced.
// These eat into available credit even though there is no account_entry yet.
const IN_FLIGHT_STATUSES = [
  'confirmed',
  'stock_reserved',
  'in_preparation',
  'ready_to_dispatch',
  'dispatched',
];

const TRANSITIONS: TransitionMap<string> = {
  draft: ['active'],
  active: ['on_hold', 'blocked', 'inactive'],
  on_hold: ['active', 'blocked', 'inactive'],
  blocked: ['active', 'inactive'],
  inactive: ['active', 'archived'],
  archived: [],
};

const CUSTOMER_COLUMNS: ColumnMap = {
  legalName:     { type: 'string', column: 'legalName' },
  commercialName:{ type: 'string', column: 'commercialName' },
  taxId:         { type: 'string', column: 'taxId' },
  status:        { type: 'enum',   column: 'status' },
  channel:       { type: 'enum',   column: 'channel' },
  category:      { type: 'enum',   column: 'category' },
  zoneId:        { type: 'enum',   column: 'zoneId' },
  routeId:       { type: 'enum',   column: 'routeId' },
  assignedSellerId: { type: 'enum', column: 'assignedSellerId' },
  creditPolicy:  { type: 'enum',   column: 'creditPolicy' },
  customerType:  { type: 'enum',   column: 'customerType' },
  createdAt:     { type: 'date',   column: 'createdAt' },
};

const CUSTOMER_SORTABLE: SortableMap = [
  'legalName', 'commercialName', 'taxId', 'status', 'channel', 'category',
  'creditLimit', 'createdAt', 'updatedAt',
];

const CUSTOMER_SEARCH = ['legal_name', 'commercial_name', 'tax_id', 'phone', 'email'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('c');
  query.applyTo(qb, 'c', CUSTOMER_COLUMNS, CUSTOMER_SORTABLE, CUSTOMER_SEARCH, {
    field: 'createdAt', direction: 'DESC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const totalsQb = repo.createQueryBuilder('c')
    .select('COUNT(c.id)', 'total')
    .addSelect('COALESCE(SUM(c.credit_limit), 0)', 'totalCreditLimit');
  query.applyFilters(totalsQb, 'c', CUSTOMER_COLUMNS, CUSTOMER_SEARCH);
  const totals = await totalsQb.getRawOne();

  const byStatusQb = repo.createQueryBuilder('c')
    .select('c.status', 'status')
    .addSelect('COUNT(c.id)', 'count')
    .groupBy('c.status');
  query.applyFilters(byStatusQb, 'c', CUSTOMER_COLUMNS, CUSTOMER_SEARCH);
  const byStatusRows = await byStatusQb.getRawMany();

  return {
    total: Number(totals?.total ?? 0),
    totalCreditLimit: Number(totals?.totalCreditLimit ?? 0),
    byStatus: byStatusRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = Number(r.count); return acc;
    }, {}),
  };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id }, relations: ['contacts', 'addresses'] });
  if (!item) throw new NotFoundError('Cliente no encontrado');
  return item;
}

export async function create(data: Partial<CustomerEntity>) {
  const item = repo.create(data);
  const saved = await repo.save(item);
  eventBus.emit(CustomerEvents.CREATED, saved);
  logger.info({ action: 'create', customerId: saved.id, legalName: saved.legalName, taxId: saved.taxId, status: saved.status }, 'Customer created');
  return saved;
}

export async function update(id: string, data: Partial<CustomerEntity>) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(CustomerEvents.UPDATED, saved);
  logger.info({ action: 'update', customerId: id }, 'Customer updated');
  return saved;
}

export async function changeStatus(id: string, newStatus: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'customer');
  item.status = newStatus;
  const saved = await repo.save(item);

  const eventMap: Record<string, string> = {
    active: CustomerEvents.ACTIVATED,
    blocked: CustomerEvents.BLOCKED,
    archived: CustomerEvents.ARCHIVED,
  };
  const event = eventMap[newStatus];
  if (event) eventBus.emit(event, saved);

  logger.info({ action: 'transition', customerId: id, from, to: newStatus }, 'Customer status updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  logger.info({ action: 'delete', customerId: id }, 'Customer deleted');
}

export interface CreditCheckResult {
  ok: boolean;
  reason?: 'policy_blocked' | 'over_credit_limit' | 'overdue_balance';
  detail?: Record<string, any>;
}

export async function checkCredit(customerId: string, amount: number): Promise<CreditCheckResult> {
  const customer = await repo.findOne({ where: { id: customerId } });
  if (!customer) throw new NotFoundError('Cliente no encontrado');

  if (customer.creditPolicy === 'blocked') {
    return { ok: false, reason: 'policy_blocked', detail: { creditPolicy: customer.creditPolicy } };
  }

  const account = await accountRepo.findOne({ where: { entityType: 'customer', entityId: customerId } });
  const currentBalance = Number(account?.currentBalance ?? 0);
  const overdueBalance = Number(account?.overdueBalance ?? 0);
  const creditLimit = Number(customer.creditLimit ?? 0);
  const amountNum = Number(amount ?? 0);

  // Sum committed-but-not-yet-invoiced orders so a customer cannot saturate credit
  // by stacking confirmed orders.
  const inFlightRow = await orderRepo
    .createQueryBuilder('o')
    .select('COALESCE(SUM(o.total), 0)', 'total')
    .where('o.customer_id = :id', { id: customerId })
    .andWhere('o.status IN (:...statuses)', { statuses: IN_FLIGHT_STATUSES })
    .getRawOne<{ total: string }>();
  const inFlightTotal = Number(inFlightRow?.total ?? 0);

  // strict policy: block the order if this addition would exceed the credit limit
  if (customer.creditPolicy === 'strict' && creditLimit > 0) {
    const projected = currentBalance + inFlightTotal + amountNum;
    if (projected > creditLimit) {
      return {
        ok: false,
        reason: 'over_credit_limit',
        detail: { currentBalance, inFlightTotal, creditLimit, requested: amountNum, projected },
      };
    }
  }

  // block on overdue: respect even under normal policy
  if (customer.blockOnOverdue && overdueBalance > 0) {
    return {
      ok: false,
      reason: 'overdue_balance',
      detail: { overdueBalance, overdueDaysThreshold: customer.overdueDaysThreshold },
    };
  }

  return { ok: true };
}

export async function assertCreditOrThrow(customerId: string, amount: number) {
  const result = await checkCredit(customerId, amount);
  if (!result.ok) {
    const message =
      result.reason === 'policy_blocked'
        ? 'Customer credit is blocked by policy'
        : result.reason === 'over_credit_limit'
        ? 'Order exceeds customer credit limit'
        : 'Customer has overdue balance and block_on_overdue is set';
    throw new BusinessLogicError('CREDIT_BLOCK', message, {
      reason: result.reason,
      ...result.detail,
    });
  }
}
