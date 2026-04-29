import { AppDataSource } from '../../config/data-source';
import { DebitNoteEntity } from './data_access/debit-note.entity';
import { DebitNoteItemEntity } from './data_access/debit-note-item.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { DebitNoteEvents } from './debit-notes.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(DebitNoteEntity);
const itemRepo = AppDataSource.getRepository(DebitNoteItemEntity);

const TRANSITIONS: TransitionMap<string> = {
  draft: ['pending_issue', 'cancelled'],
  pending_issue: ['issued', 'cancelled'],
  issued: ['cancelled'],
  cancelled: [],
};

const DBN_COLUMNS: ColumnMap = {
  status:       { type: 'enum',   column: 'status' },
  customerId:   { type: 'enum',   column: 'customerId' },
  invoiceType:  { type: 'enum',   column: 'invoiceType' },
  number:       { type: 'string', column: 'number' },
  total:        { type: 'number', column: 'total' },
  issueDate:    { type: 'date',   column: 'issueDate' },
  createdAt:    { type: 'date',   column: 'createdAt' },
  customerName: { type: 'string', sql: 'cu.legal_name' },
};
const DBN_SORTABLE: SortableMap = {
  issueDate: 'c.issueDate', total: 'c.total', status: 'c.status',
  createdAt: 'c.createdAt', number: 'c.number', customerName: 'cu.legal_name',
};
const DBN_SEARCH = ['c.number', 'c.reason', 'cu.legal_name'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('c')
    .leftJoin('customers', 'cu', 'cu.id::text = c.customer_id::text')
    .addSelect('cu.legal_name', 'customerName');
  query.applyTo(qb, 'c', DBN_COLUMNS, DBN_SORTABLE, DBN_SEARCH, {
    field: 'createdAt', direction: 'DESC',
  });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({ ...e, customerName: raw[i]?.customerName ?? null }));
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id }, relations: ['items'] });
  if (!item) throw new NotFoundError('Nota de débito no encontrada');
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
  const saved = await repo.save(repo.create({
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
  }));
  eventBus.emit(DebitNoteEvents.CREATED, saved);
  logger.info({ action: 'create', debitNoteId: saved.id, customerId: saved.customerId, total: saved.total }, 'Debit note created');
  return saved;
}

async function transitionTo(id: string, newStatus: string, event: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'debit_note');
  item.status = newStatus;
  const saved = await repo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', debitNoteId: id, from, to: newStatus }, 'Debit note status updated');
  return saved;
}

export async function issue(id: string) { return transitionTo(id, 'issued', DebitNoteEvents.ISSUED); }
export async function cancel(id: string) { return transitionTo(id, 'cancelled', DebitNoteEvents.CANCELLED); }
