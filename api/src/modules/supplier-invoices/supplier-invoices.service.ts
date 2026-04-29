import { AppDataSource } from '../../config/data-source';
import { SupplierInvoiceEntity } from './data_access/supplier-invoice.entity';
import { SupplierInvoiceItemEntity } from './data_access/supplier-invoice-item.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { SupplierInvoiceEvents } from './supplier-invoices.events';
import * as accountsService from '../accounts/accounts.service';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(SupplierInvoiceEntity);
const itemRepo = AppDataSource.getRepository(SupplierInvoiceItemEntity);

const TRANSITIONS: TransitionMap<string> = {
  draft: ['pending_approval', 'cancelled', 'disputed'],
  pending_approval: ['matched', 'approved', 'disputed', 'cancelled'],
  matched: ['approved', 'disputed', 'cancelled'],
  approved: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
  disputed: ['pending_approval', 'cancelled'],
};

function calcTotals(items: Array<{ quantity: number; unitCost: number; discount?: number; tax?: number; subtotal: number }>, perceptions = 0) {
  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitCost) - Number(i.discount || 0), 0);
  const taxes = items.reduce((s, i) => s + Number(i.tax || 0), 0);
  const total = subtotal + taxes + Number(perceptions);
  return { subtotal, taxes, total };
}

const SI_COLUMNS: ColumnMap = {
  supplierId:   { type: 'enum',   column: 'supplierId' },
  status:       { type: 'enum',   column: 'status' },
  invoiceType:  { type: 'enum',   column: 'invoiceType' },
  currency:     { type: 'enum',   column: 'currency' },
  supplierInvoiceNumber: { type: 'string', column: 'supplierInvoiceNumber' },
  total:        { type: 'number', column: 'total' },
  issueDate:    { type: 'date',   column: 'issueDate' },
  receptionDate:{ type: 'date',   column: 'receptionDate' },
  dueDate:      { type: 'date',   column: 'dueDate' },
  createdAt:    { type: 'date',   column: 'createdAt' },
  supplierName: { type: 'string', sql: 's.name' },
};
const SI_SORTABLE: SortableMap = {
  issueDate: 'i.issueDate', dueDate: 'i.dueDate', total: 'i.total',
  status: 'i.status', createdAt: 'i.createdAt',
  supplierInvoiceNumber: 'i.supplier_invoice_number',
  supplierName: 's.name',
};
const SI_SEARCH = ['i.supplier_invoice_number', 'i.notes', 's.name'];

function buildSiQB() {
  return repo.createQueryBuilder('i')
    .leftJoin('suppliers', 's', 's.id::text = i.supplier_id::text');
}

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildSiQB().addSelect('s.name', 'supplierName');
  query.applyTo(qb, 'i', SI_COLUMNS, SI_SORTABLE, SI_SEARCH, {
    field: 'issueDate', direction: 'DESC',
  });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({ ...e, supplierName: raw[i]?.supplierName ?? null }));
  return { items, meta: query.buildMeta(total) };
}

export async function findSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildSiQB()
    .select('COUNT(i.id)', 'total')
    .addSelect('COALESCE(SUM(i.total), 0)', 'totalAmount');
  query.applyFilters(qb, 'i', SI_COLUMNS, SI_SEARCH);
  const row = await qb.getRawOne();
  return {
    total: Number(row?.total ?? 0),
    totalAmount: Number(row?.totalAmount ?? 0),
  };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id }, relations: ['items'] });
  if (!item) throw new NotFoundError('Factura de proveedor no encontrada');
  return item;
}

export async function create(data: any) {
  const items = data.items.map((i: any) => itemRepo.create({
    productId: i.productId,
    description: i.description,
    quantity: i.quantity,
    unitCost: i.unitCost,
    discount: i.discount ?? 0,
    tax: i.tax ?? 0,
    subtotal: Number(i.quantity) * Number(i.unitCost) - Number(i.discount ?? 0) + Number(i.tax ?? 0),
    purchaseOrderItemId: i.purchaseOrderItemId,
    receptionItemId: i.receptionItemId,
  }));

  const totals = calcTotals(items, data.perceptions ?? 0);

  const existing = await repo.findOne({
    where: {
      supplierId: data.supplierId,
      invoiceType: data.invoiceType ?? 'A',
      salesPoint: data.salesPoint ?? '',
      supplierInvoiceNumber: data.supplierInvoiceNumber,
    },
  });
  if (existing) {
    throw new BusinessLogicError('DUPLICATE_SUPPLIER_INVOICE', 'Ya existe una factura de proveedor con ese número');
  }

  const inv = repo.create({
    supplierId: data.supplierId,
    invoiceType: data.invoiceType ?? 'A',
    supplierInvoiceNumber: data.supplierInvoiceNumber,
    salesPoint: data.salesPoint,
    issueDate: data.issueDate,
    receptionDate: data.receptionDate,
    dueDate: data.dueDate,
    currency: data.currency ?? 'ARS',
    perceptions: data.perceptions ?? 0,
    subtotal: totals.subtotal,
    taxes: totals.taxes,
    total: totals.total,
    status: 'draft',
    cae: data.cae,
    caeExpiration: data.caeExpiration,
    purchaseOrderId: data.purchaseOrderId,
    notes: data.notes,
    items,
  });

  const saved = await repo.save(inv);
  eventBus.emit(SupplierInvoiceEvents.CREATED, saved);
  logger.info({ action: 'create', supplierInvoiceId: saved.id, supplierId: saved.supplierId, total: saved.total }, 'Supplier invoice created');
  return saved;
}

export async function update(id: string, data: any) {
  const item = await findById(id);
  if (item.status !== 'draft') {
    throw new BusinessLogicError('INVALID_STATE', 'La factura de proveedor solo puede modificarse en estado borrador');
  }
  Object.assign(item, data);
  const saved = await repo.save(item);
  logger.info({ action: 'update', supplierInvoiceId: id }, 'Supplier invoice updated');
  return saved;
}

async function transitionTo(id: string, newStatus: string, event: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'supplier_invoice');
  item.status = newStatus;
  const saved = await repo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', supplierInvoiceId: id, from, to: newStatus }, 'Supplier invoice status updated');
  return saved;
}

export async function submit(id: string) { return transitionTo(id, 'pending_approval', SupplierInvoiceEvents.SUBMITTED); }
export async function dispute(id: string) { return transitionTo(id, 'disputed', SupplierInvoiceEvents.DISPUTED); }
export async function cancel(id: string) { return transitionTo(id, 'cancelled', SupplierInvoiceEvents.CANCELLED); }

export async function approve(id: string) {
  const saved = await transitionTo(id, 'approved', SupplierInvoiceEvents.APPROVED);
  // Create AP ledger entry
  try {
    await accountsService.createEntry({
      entityType: 'supplier',
      entityId: saved.supplierId,
      type: 'debit',
      concept: `Factura proveedor ${saved.supplierInvoiceNumber}`,
      amount: Number(saved.total),
      referenceType: 'supplier_invoice',
      referenceId: saved.id,
    });
  } catch (e) {
    logger.error({ err: e, supplierInvoiceId: saved.id }, 'Failed to create AP entry for supplier invoice');
  }
  return saved;
}

export async function markMatched(id: string) { return transitionTo(id, 'matched', SupplierInvoiceEvents.MATCHED); }
