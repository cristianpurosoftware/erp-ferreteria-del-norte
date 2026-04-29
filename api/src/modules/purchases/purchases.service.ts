import { AppDataSource } from '../../config/data-source';
import { PurchaseOrderEntity } from './data_access/purchase-order.entity';
import { PurchaseOrderItemEntity } from './data_access/purchase-order-item.entity';
import { PurchaseReceptionEntity } from './data_access/purchase-reception.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { PurchaseEvents } from './purchases.events';
import { logger } from '../../common/logger';

const orderRepo = AppDataSource.getRepository(PurchaseOrderEntity);
const itemRepo = AppDataSource.getRepository(PurchaseOrderItemEntity);
const receptionRepo = AppDataSource.getRepository(PurchaseReceptionEntity);

const TRANSITIONS: TransitionMap<string> = {
  draft: ['requested', 'cancelled'],
  requested: ['approved', 'cancelled'],
  approved: ['sent', 'cancelled'],
  sent: ['partially_received', 'received', 'cancelled'],
  partially_received: ['received'],
  received: [],
  cancelled: [],
};

const EDITABLE_STATUSES = new Set(['draft', 'requested']);

const PO_COLUMNS: ColumnMap = {
  status:       { type: 'enum',   column: 'status' },
  supplierId:   { type: 'enum',   column: 'supplierId' },
  branchId:     { type: 'enum',   column: 'branchId' },
  total:        { type: 'number', column: 'total' },
  date:         { type: 'date',   column: 'date' },
  createdAt:    { type: 'date',   column: 'createdAt' },
  supplierName: { type: 'string', sql: 's.name' },
};
const PO_SORTABLE: SortableMap = {
  date: 'po.date', total: 'po.total', status: 'po.status', createdAt: 'po.createdAt',
  supplierName: 's.name',
};
const PO_SEARCH = ['po.notes', 's.name'];

function buildPoQB() {
  return orderRepo.createQueryBuilder('po')
    .leftJoin('suppliers', 's', 's.id::text = po.supplier_id::text');
}

async function validateProducts(productIds: string[]) {
  if (productIds.length === 0) return;
  const rows: { id: string; status: string; deletedAt: string | null }[] =
    await AppDataSource.query(
      `SELECT id::text AS id, status, deleted_at AS "deletedAt"
       FROM products
       WHERE id::text = ANY($1)`,
      [productIds],
    );
  const found = new Map(rows.map(r => [r.id, r]));
  for (const pid of productIds) {
    const p = found.get(pid);
    if (!p) throw new BusinessLogicError('PRODUCT_NOT_FOUND', `Producto ${pid} no encontrado`);
    if (p.deletedAt) throw new BusinessLogicError('PRODUCT_DELETED', `El producto ${pid} fue eliminado`);
    if (p.status !== 'active') throw new BusinessLogicError('PRODUCT_INACTIVE', `El producto ${pid} no está activo`);
  }
}

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildPoQB().addSelect('s.name', 'supplierName');

  query.applyTo(qb, 'po', PO_COLUMNS, PO_SORTABLE, PO_SEARCH, {
    field: 'createdAt', direction: 'DESC',
  });

  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({ ...e, supplierName: raw[i]?.supplierName ?? null }));
  return { items, meta: query.buildMeta(total) };
}

export async function findSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildPoQB()
    .select('COUNT(po.id)', 'total')
    .addSelect('COALESCE(SUM(po.total), 0)', 'totalAmount');
  query.applyFilters(qb, 'po', PO_COLUMNS, PO_SEARCH);
  const row = await qb.getRawOne();
  return {
    total: Number(row?.total ?? 0),
    totalAmount: Number(row?.totalAmount ?? 0),
  };
}

export async function findById(id: string) {
  const order = await orderRepo.findOne({ where: { id }, relations: ['items'] });
  if (!order) throw new NotFoundError('Orden de compra no encontrada');

  const productIds = order.items?.map((i) => i.productId).filter(Boolean) ?? [];
  const productMap = new Map<string, { name: string; status: string; deletedAt: string | null }>();
  if (productIds.length > 0) {
    const rows: { id: string; name: string; status: string; deletedAt: string | null }[] =
      await AppDataSource.query(
        `SELECT id::text AS id, name, status, deleted_at AS "deletedAt"
         FROM products
         WHERE id::text = ANY($1)`,
        [productIds],
      );
    for (const p of rows) productMap.set(p.id, { name: p.name, status: p.status, deletedAt: p.deletedAt });
  }

  return {
    ...order,
    items: order.items?.map((i) => {
      const p = productMap.get(i.productId);
      const isDeleted = !!p?.deletedAt;
      const isActive = p?.status === 'active';
      const available = !!p && !isDeleted && isActive;
      return {
        ...i,
        productName: p && !isDeleted ? p.name : null,
        productStatus: p?.status ?? null,
        productAvailable: available,
      };
    }),
  };
}

export async function create(data: {
  supplierId: string;
  branchId?: string;
  notes?: string;
  items: { productId: string; quantity: number; unitCost: number }[];
}) {
  await validateProducts(data.items.map(i => i.productId));

  const items = data.items.map((i) => {
    const subtotal = Number((i.quantity * i.unitCost).toFixed(2));
    return itemRepo.create({
      productId: i.productId,
      quantity: i.quantity,
      unitCost: i.unitCost,
      subtotal,
    });
  });

  const subtotal = items.reduce((sum, i) => sum + Number(i.subtotal), 0);

  const order = orderRepo.create({
    supplierId: data.supplierId,
    branchId: data.branchId,
    notes: data.notes,
    subtotal,
    total: subtotal,
    items,
  });

  const saved = await orderRepo.save(order);
  eventBus.emit(PurchaseEvents.CREATED, saved);
  logger.info({ action: 'create', purchaseId: saved.id, supplierId: saved.supplierId, total: saved.total }, 'Purchase order created');
  return saved;
}

export async function update(id: string, data: {
  supplierId?: string;
  branchId?: string | null;
  notes?: string | null;
  items: { productId: string; quantity: number; unitCost: number }[];
}) {
  const order = await findById(id);

  if (!EDITABLE_STATUSES.has(order.status)) {
    throw new BusinessLogicError(
      'PURCHASE_ORDER_NOT_EDITABLE',
      `La orden de compra no puede editarse en estado ${order.status}`,
    );
  }

  await validateProducts(data.items.map(i => i.productId));

  await itemRepo.delete({ purchaseOrderId: id });

  const newItems = data.items.map((i) => {
    const subtotal = Number((i.quantity * i.unitCost).toFixed(2));
    return itemRepo.create({ purchaseOrderId: id, productId: i.productId, quantity: i.quantity, unitCost: i.unitCost, subtotal });
  });
  await itemRepo.save(newItems);

  const subtotal = Number(newItems.reduce((sum, i) => sum + Number(i.subtotal), 0).toFixed(2));

  const rawOrder = await orderRepo.findOneOrFail({ where: { id } });
  if (data.supplierId) rawOrder.supplierId = data.supplierId;
  if (data.branchId !== undefined) rawOrder.branchId = data.branchId as string;
  if (data.notes !== undefined) rawOrder.notes = data.notes as string;
  rawOrder.subtotal = subtotal;
  rawOrder.taxes = 0;
  rawOrder.total = subtotal;

  const saved = await orderRepo.save(rawOrder);
  eventBus.emit(PurchaseEvents.UPDATED, saved);
  logger.info({ action: 'update', purchaseId: saved.id }, 'Purchase order updated');
  return saved;
}

async function transition(id: string, newStatus: string, event: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'purchase order');
  item.status = newStatus;
  const saved = await orderRepo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', purchaseId: id, from, to: newStatus }, 'Purchase order status updated');
  return saved;
}

export async function approve(id: string) {
  return transition(id, 'approved', PurchaseEvents.APPROVED);
}

export async function send(id: string) {
  return transition(id, 'sent', PurchaseEvents.SENT);
}

export async function receive(id: string) {
  return transition(id, 'received', PurchaseEvents.RECEIVED);
}

export async function partiallyReceive(id: string) {
  return transition(id, 'partially_received', PurchaseEvents.PARTIALLY_RECEIVED);
}

export async function cancel(id: string) {
  return transition(id, 'cancelled', PurchaseEvents.CANCELLED);
}

export async function createReception(purchaseOrderId: string, data: { warehouseId: string; notes?: string }) {
  const order = await findById(purchaseOrderId);

  const reception = receptionRepo.create({
    purchaseOrderId: order.id,
    warehouseId: data.warehouseId,
    notes: data.notes,
    status: 'completed',
  });
  const saved = await receptionRepo.save(reception);

  eventBus.emit(PurchaseEvents.RECEPTION_COMPLETED, { reception: saved, order });
  logger.info({ action: 'create', purchaseId: saved.id, purchaseOrderId: saved.purchaseOrderId, warehouseId: saved.warehouseId }, 'Purchase reception created');
  return saved;
}
