import { AppDataSource } from '../../config/data-source';
import { CommissionEntity } from './data_access/commission.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { CommissionEvents } from './commissions.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(CommissionEntity);

const TRANSITIONS: TransitionMap<string> = {
  accrued: ['approved', 'reversed'],
  approved: ['paid', 'reversed'],
  paid: ['reversed'],
  reversed: [],
};

const DEFAULT_RATE_PCT = Number(process.env.COMMISSION_DEFAULT_RATE_PCT ?? '5');

const COMM_COLUMNS: ColumnMap = {
  status:     { type: 'enum',   column: 'status' },
  sellerId:   { type: 'enum',   column: 'sellerId' },
  orderId:    { type: 'enum',   column: 'orderId' },
  amount:     { type: 'number', column: 'amount' },
  paidAt:     { type: 'date',   column: 'paidAt' },
  createdAt:  { type: 'date',   column: 'createdAt' },
  sellerName: { type: 'string', sql: "TRIM(CONCAT(u.first_name, ' ', u.last_name))" },
};
const COMM_SORTABLE: SortableMap = {
  amount: 'c.amount', status: 'c.status', createdAt: 'c.createdAt', paidAt: 'c.paidAt',
  sellerName: "TRIM(CONCAT(u.first_name, ' ', u.last_name))",
};
const COMM_SEARCH = ["TRIM(CONCAT(u.first_name, ' ', u.last_name))"];

function buildCommQB() {
  return repo.createQueryBuilder('c')
    .leftJoin('users', 'u', 'u.id::text = c.seller_id::text')
    .leftJoin('orders', 'o', 'o.id::text = c.order_id::text');
}

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildCommQB()
    .addSelect("TRIM(CONCAT(u.first_name, ' ', u.last_name))", 'sellerName')
    .addSelect('o.number', 'orderNumber');

  query.applyTo(qb, 'c', COMM_COLUMNS, COMM_SORTABLE, COMM_SEARCH, {
    field: 'createdAt', direction: 'DESC',
  });

  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    sellerName: raw[i]?.sellerName?.trim() || null,
    orderNumber: raw[i]?.orderNumber ?? null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function findSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildCommQB()
    .select('COUNT(c.id)', 'total')
    .addSelect('COALESCE(SUM(c.amount), 0)', 'totalAmount');
  query.applyFilters(qb, 'c', COMM_COLUMNS, COMM_SEARCH);
  const row = await qb.getRawOne();
  return {
    total: Number(row?.total ?? 0),
    totalAmount: Number(row?.totalAmount ?? 0),
  };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Comisión no encontrada');
  return item;
}

export async function accrueForOrder(order: {
  id: string;
  sellerId?: string | null;
  total: number;
  ratePct?: number;
}) {
  if (!order.sellerId) return null;
  const existing = await repo.findOne({ where: { orderId: order.id } });
  if (existing) return existing;

  const rate = order.ratePct ?? DEFAULT_RATE_PCT;
  const base = Number(order.total);
  const amount = Math.round(base * rate) / 100;

  const commission = repo.create({
    sellerId: order.sellerId,
    orderId: order.id,
    baseAmount: base,
    rate,
    amount,
    status: 'accrued',
  });
  const saved = await repo.save(commission);
  eventBus.emit(CommissionEvents.ACCRUED, saved);
  logger.info({ action: 'create', commissionId: saved.id, sellerId: saved.sellerId, orderId: saved.orderId, amount: saved.amount }, 'Commission accrued');
  return saved;
}

async function transitionTo(id: string, newStatus: string, event: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'commission');
  item.status = newStatus;
  if (newStatus === 'paid') item.paidAt = new Date();
  const saved = await repo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', commissionId: id, from, to: newStatus }, 'Commission status updated');
  return saved;
}

export async function approve(id: string) {
  return transitionTo(id, 'approved', CommissionEvents.APPROVED);
}

export async function pay(id: string, paymentId?: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, 'paid', 'commission');
  item.status = 'paid';
  item.paidAt = new Date();
  if (paymentId) item.paymentId = paymentId;
  const saved = await repo.save(item);
  eventBus.emit(CommissionEvents.PAID, saved);
  logger.info({ action: 'transition', commissionId: id, from, to: 'paid' }, 'Commission status updated');
  return saved;
}

export async function reverse(id: string) {
  return transitionTo(id, 'reversed', CommissionEvents.REVERSED);
}
