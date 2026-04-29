import { AppDataSource } from '../../config/data-source';
import { withTransaction } from '../../common/transaction';
import { PaymentEntity } from './data_access/payment.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { PaymentEvents } from './payments.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(PaymentEntity);

const TRANSITIONS: TransitionMap<string> = {
  draft: ['pending', 'cancelled'],
  pending: ['registered', 'failed', 'cancelled'],
  registered: ['applied', 'cancelled'],
  applied: ['reconciled'],
  failed: [],
  reconciled: [],
  cancelled: [],
};

const PAYMENT_COLUMNS: ColumnMap = {
  type:          { type: 'enum',   column: 'type' },
  status:        { type: 'enum',   column: 'status' },
  customerId:    { type: 'enum',   column: 'customerId' },
  supplierId:    { type: 'enum',   column: 'supplierId' },
  paymentMethod: { type: 'enum',   column: 'paymentMethod' },
  currency:      { type: 'enum',   column: 'currency' },
  amount:        { type: 'number', column: 'amount' },
  date:          { type: 'date',   column: 'date' },
  createdAt:     { type: 'date',   column: 'createdAt' },
  customerName:  { type: 'string', sql: 'COALESCE(c.commercial_name, c.legal_name)' },
};
const PAYMENT_SORTABLE: SortableMap = {
  date: 'p.date', amount: 'p.amount', status: 'p.status', createdAt: 'p.createdAt',
  customerName: 'COALESCE(c.commercial_name, c.legal_name)',
};
const PAYMENT_SEARCH = ['p.external_reference', 'p.notes', 'COALESCE(c.commercial_name, c.legal_name)'];

function buildPaymentsQB() {
  return repo.createQueryBuilder('p')
    .leftJoin('customers', 'c', 'c.id::text = p.customer_id');
}

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildPaymentsQB()
    .addSelect('COALESCE(c.commercial_name, c.legal_name)', 'customerName');

  query.applyTo(qb, 'p', PAYMENT_COLUMNS, PAYMENT_SORTABLE, PAYMENT_SEARCH, {
    field: 'date', direction: 'DESC',
  });

  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    customerName: raw[i]?.customerName ?? null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function findSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildPaymentsQB()
    .select('COUNT(p.id)', 'total')
    .addSelect('COALESCE(SUM(p.amount), 0)', 'totalAmount');
  query.applyFilters(qb, 'p', PAYMENT_COLUMNS, PAYMENT_SEARCH);
  const row = await qb.getRawOne();
  return {
    total: Number(row?.total ?? 0),
    totalAmount: Number(row?.totalAmount ?? 0),
  };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Pago no encontrado');
  return item;
}

export async function create(data: Partial<PaymentEntity>) {
  const item = repo.create(data);
  const saved = await repo.save(item);
  eventBus.emit(PaymentEvents.CREATED, saved);
  logger.info({ action: 'create', paymentId: saved.id }, 'Payment created');
  return saved;
}

async function transition(id: string, newStatus: string, event: string) {
  let fromStatus: string;
  const saved = await withTransaction(async (em) => {
    const tx = em.getRepository(PaymentEntity);
    const item = await tx.findOne({ where: { id } });
    if (!item) throw new NotFoundError('Pago no encontrado');
    assertTransition(TRANSITIONS, item.status, newStatus, 'payment');
    fromStatus = item.status;
    item.status = newStatus;
    return tx.save(item);
  });
  eventBus.emit(event, saved);
  logger.info({ action: 'status_transition', paymentId: saved.id, from: fromStatus!, to: newStatus }, 'Payment status transitioned');
  return saved;
}

export async function register(id: string) {
  return transition(id, 'registered', PaymentEvents.REGISTERED);
}

export async function apply(id: string) {
  return transition(id, 'applied', PaymentEvents.APPLIED);
}

export async function reconcile(id: string) {
  return transition(id, 'reconciled', PaymentEvents.RECONCILED);
}

export async function fail(id: string) {
  return transition(id, 'failed', PaymentEvents.FAILED);
}

export async function cancel(id: string) {
  return transition(id, 'cancelled', PaymentEvents.CANCELLED);
}
