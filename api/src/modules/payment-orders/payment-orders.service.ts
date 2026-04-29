import { AppDataSource } from '../../config/data-source';
import { PaymentOrderEntity } from './data_access/payment-order.entity';
import { PaymentBatchEntity } from './data_access/payment-batch.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { PaymentOrderEvents } from './payment-orders.events';
import { logger } from '../../common/logger';

const orderRepo = AppDataSource.getRepository(PaymentOrderEntity);
const batchRepo = AppDataSource.getRepository(PaymentBatchEntity);

const ORDER_TRANSITIONS: TransitionMap<string> = {
  draft: ['approved', 'cancelled'],
  approved: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
};

const BATCH_TRANSITIONS: TransitionMap<string> = {
  draft: ['processed', 'cancelled'],
  processed: [],
  cancelled: [],
};

// Payment orders
const PO_COLUMNS: ColumnMap = {
  status:       { type: 'enum',   column: 'status' },
  supplierId:   { type: 'enum',   column: 'supplierId' },
  date:         { type: 'date',   column: 'date' },
  createdAt:    { type: 'date',   column: 'createdAt' },
  total:        { type: 'number', column: 'total' },
  supplierName: { type: 'string', sql: 's.name' },
};
const PO_SORTABLE: SortableMap = { date: 'p.date', status: 'p.status', total: 'p.total', createdAt: 'p.createdAt', supplierName: 's.name' };
const PO_SEARCH = ['s.name'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = orderRepo.createQueryBuilder('p')
    .leftJoin('suppliers', 's', 's.id::text = p.supplier_id::text')
    .addSelect('s.name', 'supplierName');
  query.applyTo(qb, 'p', PO_COLUMNS, PO_SORTABLE, PO_SEARCH, { field: 'date', direction: 'DESC' });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({ ...e, supplierName: raw[i]?.supplierName ?? null }));
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await orderRepo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Orden de pago no encontrada');
  return item;
}

export async function create(data: any) {
  const saved = await orderRepo.save(orderRepo.create({ ...data, status: 'draft' } as PaymentOrderEntity));
  eventBus.emit(PaymentOrderEvents.CREATED, saved);
  logger.info({ action: 'create', paymentOrderId: saved.id, supplierId: saved.supplierId, total: saved.total }, 'Payment order created');
  return saved;
}

async function transitionOrder(id: string, newStatus: string, event: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(ORDER_TRANSITIONS, from, newStatus, 'payment_order');
  item.status = newStatus;
  const saved = await orderRepo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', paymentOrderId: id, from, to: newStatus }, 'Payment order status updated');
  return saved;
}

export async function approve(id: string) { return transitionOrder(id, 'approved', PaymentOrderEvents.APPROVED); }
export async function pay(id: string) { return transitionOrder(id, 'paid', PaymentOrderEvents.PAID); }
export async function cancel(id: string) { return transitionOrder(id, 'cancelled', 'payment_order.cancelled'); }

// Batches
const BATCH_COLUMNS: ColumnMap = {
  status:        { type: 'enum',   column: 'status' },
  bankAccountId: { type: 'enum',   column: 'bankAccountId' },
  date:          { type: 'date',   column: 'date' },
  total:         { type: 'number', column: 'total' },
  bankAccountName:{ type: 'string', sql: 'ba.name' },
};
const BATCH_SORTABLE: SortableMap = { date: 'b.date', status: 'b.status', total: 'b.total', bankAccountName: 'ba.name' };
const BATCH_SEARCH = ['ba.name', 'ba.bank_name'];

export async function findAllBatches(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = batchRepo.createQueryBuilder('b')
    .leftJoin('bank_accounts', 'ba', 'ba.id::text = b.bank_account_id::text')
    .addSelect('ba.name', 'bankAccountName')
    .addSelect('ba.bank_name', 'bankName');
  query.applyTo(qb, 'b', BATCH_COLUMNS, BATCH_SORTABLE, BATCH_SEARCH, { field: 'date', direction: 'DESC' });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    bankAccountName: raw[i]?.bankAccountName ?? null,
    bankName: raw[i]?.bankName ?? null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function findBatchById(id: string) {
  const item = await batchRepo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Lote de pagos no encontrado');
  return item;
}

export async function createBatch(data: any) {
  const saved = await batchRepo.save(batchRepo.create({ ...data, status: 'draft' } as PaymentBatchEntity));
  logger.info({ action: 'create', paymentBatchId: saved.id, bankAccountId: saved.bankAccountId, total: saved.total }, 'Payment batch created');
  return saved;
}

export async function generateFile(id: string) {
  const batch = await findBatchById(id);
  // Stub: attach a synthetic URL
  batch.fileUrl = `/files/payment-batches/${batch.id}.txt`;
  const saved = await batchRepo.save(batch);
  logger.info({ action: 'update', paymentBatchId: id, fileUrl: saved.fileUrl }, 'Payment batch file generated');
  return saved;
}

export async function markProcessed(id: string) {
  const item = await findBatchById(id);
  const from = item.status;
  assertTransition(BATCH_TRANSITIONS, from, 'processed', 'payment_batch');
  item.status = 'processed';
  const saved = await batchRepo.save(item);
  eventBus.emit(PaymentOrderEvents.BATCH_PROCESSED, saved);
  logger.info({ action: 'transition', paymentBatchId: id, from, to: 'processed' }, 'Payment batch status updated');
  return saved;
}
