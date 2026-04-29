import { AppDataSource } from '../../config/data-source';
import { InvoiceEntity } from './data_access/invoice.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { InvoiceEvents } from './invoices.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(InvoiceEntity);

const TRANSITIONS: TransitionMap<string> = {
  draft: ['pending_issue', 'cancelled'],
  pending_issue: ['issued', 'cancelled'],
  issued: ['accepted', 'rejected'],
  accepted: ['voided'],
  rejected: [],
  cancelled: [],
  voided: [],
};

const INVOICE_COLUMNS: ColumnMap = {
  number:       { type: 'string', column: 'number' },
  status:       { type: 'enum',   column: 'status' },
  customerId:   { type: 'enum',   column: 'customerId' },
  typeId:       { type: 'enum',   column: 'typeId' },
  invoiceType:  { type: 'enum',   column: 'invoiceType' },
  total:        { type: 'number', column: 'total' },
  issueDate:    { type: 'date',   column: 'issueDate' },
  createdAt:    { type: 'date',   column: 'createdAt' },
  customerName: { type: 'string', sql: 'COALESCE(c.commercial_name, c.legal_name)' },
};

const INVOICE_SORTABLE: SortableMap = {
  number: 'i.number',
  status: 'i.status',
  total: 'i.total',
  issueDate: 'i.issueDate',
  createdAt: 'i.createdAt',
  customerName: 'COALESCE(c.commercial_name, c.legal_name)',
};

const INVOICE_SEARCH = ['i.number', 'i.notes', 'COALESCE(c.commercial_name, c.legal_name)'];

function buildInvoicesQB() {
  return repo.createQueryBuilder('i')
    .leftJoin('customers', 'c', 'c.id::text = i.customer_id');
}

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildInvoicesQB()
    .addSelect('COALESCE(c.commercial_name, c.legal_name)', 'customerName');

  query.applyTo(qb, 'i', INVOICE_COLUMNS, INVOICE_SORTABLE, INVOICE_SEARCH, {
    field: 'createdAt', direction: 'DESC',
  });

  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, idx) => ({
    ...e,
    customerName: raw[idx]?.customerName ?? null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function findSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const totalsQb = buildInvoicesQB()
    .select('COUNT(i.id)', 'total')
    .addSelect('COALESCE(SUM(i.total), 0)', 'totalAmount');
  query.applyFilters(totalsQb, 'i', INVOICE_COLUMNS, INVOICE_SEARCH);
  const totals = await totalsQb.getRawOne();

  const byStatusQb = buildInvoicesQB()
    .select('i.status', 'status')
    .addSelect('COUNT(i.id)', 'count')
    .groupBy('i.status');
  query.applyFilters(byStatusQb, 'i', INVOICE_COLUMNS, INVOICE_SEARCH);
  const byStatusRows = await byStatusQb.getRawMany();

  return {
    total: Number(totals?.total ?? 0),
    totalAmount: Number(totals?.totalAmount ?? 0),
    byStatus: byStatusRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = Number(r.count); return acc;
    }, {}),
  };
}

export async function findById(id: string) {
  const qb = repo.createQueryBuilder('i')
    .leftJoin('customers', 'c', 'c.id::text = i.customer_id')
    .leftJoin('orders', 'o', 'o.id::text = i.order_id')
    .addSelect("COALESCE(c.commercial_name, c.legal_name)", 'customerName')
    .addSelect('o.number', 'orderNumber')
    .where('i.id = :id', { id });

  const result = await qb.getRawAndEntities();
  const entity = result.entities[0];
  if (!entity) throw new NotFoundError('Factura no encontrada');

  return {
    ...entity,
    customerName: result.raw[0]?.customerName ?? null,
    orderNumber: result.raw[0]?.orderNumber ?? null,
  };
}

export async function create(data: Partial<InvoiceEntity>) {
  const item = repo.create(data);
  const saved = await repo.save(item);
  eventBus.emit(InvoiceEvents.CREATED, saved);
  logger.info({ action: 'create', invoiceId: saved.id, customerId: saved.customerId, total: saved.total, invoiceType: saved.invoiceType }, 'Invoice created');
  return saved;
}

async function transition(id: string, newStatus: string, event: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'invoice');
  item.status = newStatus;
  if (newStatus === 'issued') {
    item.issueDate = new Date();
  }
  const saved = await repo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', invoiceId: id, from, to: newStatus }, 'Invoice status updated');
  return saved;
}

export async function issue(id: string) {
  return transition(id, 'issued', InvoiceEvents.ISSUED);
}

export async function accept(id: string) {
  return transition(id, 'accepted', InvoiceEvents.ACCEPTED);
}

export async function reject(id: string) {
  return transition(id, 'rejected', InvoiceEvents.REJECTED);
}

export async function voidInvoice(id: string) {
  return transition(id, 'voided', InvoiceEvents.VOIDED);
}

export async function cancel(id: string) {
  return transition(id, 'cancelled', InvoiceEvents.CANCELLED);
}
