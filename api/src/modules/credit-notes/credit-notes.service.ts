import { AppDataSource } from '../../config/data-source';
import { CreditNoteEntity } from './data_access/credit-note.entity';
import { CreditNoteItemEntity } from './data_access/credit-note-item.entity';
import { ReturnOrderEntity } from '../returns/data_access/return-order.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { CreditNoteEvents } from './credit-notes.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(CreditNoteEntity);
const itemRepo = AppDataSource.getRepository(CreditNoteItemEntity);

const TRANSITIONS: TransitionMap<string> = {
  draft: ['pending_issue', 'cancelled'],
  pending_issue: ['issued', 'cancelled'],
  issued: ['applied', 'cancelled'],
  applied: [],
  cancelled: [],
};

const CN_COLUMNS: ColumnMap = {
  status:       { type: 'enum',   column: 'status' },
  customerId:   { type: 'enum',   column: 'customerId' },
  invoiceType:  { type: 'enum',   column: 'invoiceType' },
  number:       { type: 'string', column: 'number' },
  total:        { type: 'number', column: 'total' },
  issueDate:    { type: 'date',   column: 'issueDate' },
  createdAt:    { type: 'date',   column: 'createdAt' },
  customerName: { type: 'string', sql: 'cu.legal_name' },
};
const CN_SORTABLE: SortableMap = {
  issueDate: 'c.issueDate', total: 'c.total', status: 'c.status',
  createdAt: 'c.createdAt', number: 'c.number', customerName: 'cu.legal_name',
};
const CN_SEARCH = ['c.number', 'c.reason', 'cu.legal_name'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('c')
    .leftJoin('customers', 'cu', 'cu.id::text = c.customer_id::text')
    .addSelect('cu.legal_name', 'customerName');
  query.applyTo(qb, 'c', CN_COLUMNS, CN_SORTABLE, CN_SEARCH, {
    field: 'createdAt', direction: 'DESC',
  });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({ ...e, customerName: raw[i]?.customerName ?? null }));
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id }, relations: ['items'] });
  if (!item) throw new NotFoundError('Nota de crédito no encontrada');
  return item;
}

function totals(items: Array<{ quantity: number; unitPrice: number; discount?: number; tax?: number; subtotal: number }>) {
  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice) - Number(i.discount || 0), 0);
  const taxes = items.reduce((s, i) => s + Number(i.tax || 0), 0);
  return { subtotal, taxes, total: subtotal + taxes };
}

export async function create(data: any) {
  const items = data.items.map((i: any) => itemRepo.create({
    productId: i.productId,
    description: i.description,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    discount: i.discount ?? 0,
    tax: i.tax ?? 0,
    subtotal: Number(i.quantity) * Number(i.unitPrice) - Number(i.discount ?? 0) + Number(i.tax ?? 0),
  }));
  const t = totals(items);

  const entity = repo.create({
    customerId: data.customerId,
    originalInvoiceId: data.originalInvoiceId,
    invoiceType: data.invoiceType ?? 'A',
    salesPoint: data.salesPoint,
    issueDate: data.issueDate,
    jurisdictionId: data.jurisdictionId,
    reason: data.reason,
    status: 'draft',
    subtotal: t.subtotal,
    taxes: t.taxes,
    total: t.total,
    items,
  });

  const saved = await repo.save(entity);
  logger.info({ action: 'create', creditNoteId: saved.id, customerId: saved.customerId, total: saved.total }, 'Credit note created');
  eventBus.emit(CreditNoteEvents.CREATED, saved);
  return saved;
}

async function transitionTo(id: string, newStatus: string, event: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'credit_note');
  item.status = newStatus;
  const saved = await repo.save(item);
  logger.info({ action: 'transition', creditNoteId: id, from, to: newStatus }, 'Credit note status updated');
  eventBus.emit(event, saved);
  return saved;
}

export async function issue(id: string) { return transitionTo(id, 'issued', CreditNoteEvents.ISSUED); }
export async function apply(id: string) { return transitionTo(id, 'applied', CreditNoteEvents.APPLIED); }
export async function cancel(id: string) { return transitionTo(id, 'cancelled', CreditNoteEvents.CANCELLED); }

export async function createFromReturn(returnOrderId: string) {
  const returnRepo = AppDataSource.getRepository(ReturnOrderEntity);
  const ret = await returnRepo.findOne({ where: { id: returnOrderId }, relations: ['items'] });
  if (!ret) throw new NotFoundError('Devolución no encontrada');
  if (!ret.originalOrderId) return null; // cannot NC without original order reference

  // Find invoice from original order
  const invoice = await AppDataSource.query(
    `SELECT id FROM invoices WHERE order_id::text = $1 AND status = 'issued' ORDER BY created_at DESC LIMIT 1`,
    [ret.originalOrderId],
  );
  if (!invoice?.[0]) return null;

  const items = ret.items.map((i) => ({
    productId: i.productId,
    description: `Devolución ${i.productId}`,
    quantity: Number(i.quantity),
    unitPrice: 0,
    tax: 0,
  }));

  const nc = await create({
    customerId: ret.customerId,
    originalInvoiceId: invoice[0].id,
    reason: `return:${ret.kind}`,
    items,
  });
  return nc;
}
