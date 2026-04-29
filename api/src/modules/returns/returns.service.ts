import { AppDataSource } from '../../config/data-source';
import { ReturnOrderEntity } from './data_access/return-order.entity';
import { ReturnOrderItemEntity } from './data_access/return-order-item.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { ReturnEvents } from './returns.events';
import { createMovement } from '../inventory/inventory.service';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(ReturnOrderEntity);
const itemRepo = AppDataSource.getRepository(ReturnOrderItemEntity);

const TRANSITIONS: TransitionMap<string> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['received', 'cancelled'],
  received: ['inspected'],
  inspected: ['closed'],
  closed: [],
  cancelled: [],
};

const RETURN_COLUMNS: ColumnMap = {
  status:       { type: 'enum',   column: 'status' },
  kind:         { type: 'enum',   column: 'kind' },
  customerId:   { type: 'enum',   column: 'customerId' },
  warehouseId:  { type: 'enum',   column: 'warehouseId' },
  createdAt:    { type: 'date',   column: 'createdAt' },
  customerName: { type: 'string', sql: 'cu.legal_name' },
};
const RETURN_SORTABLE: SortableMap = ['createdAt', 'status', 'kind'];
const RETURN_SEARCH = ['cu.legal_name', 'r.notes'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('r')
    .leftJoin('customers', 'cu', 'cu.id::text = r.customer_id::text')
    .addSelect('cu.legal_name', 'customerName');
  query.applyTo(qb, 'r', RETURN_COLUMNS, RETURN_SORTABLE, RETURN_SEARCH, {
    field: 'createdAt', direction: 'DESC',
  });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({ ...e, customerName: raw[i]?.customerName ?? null }));
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const headerQb = repo.createQueryBuilder('r')
    .leftJoin('customers', 'cu', 'cu.id::text = r.customer_id::text')
    .leftJoin('orders', 'o', 'o.id::text = r.original_order_id::text')
    .addSelect('COALESCE(cu.commercial_name, cu.legal_name)', 'customerName')
    .addSelect('o.number', 'originalOrderNumber')
    .where('r.id = :id', { id });
  const { entities, raw } = await headerQb.getRawAndEntities();
  const item = entities[0];
  if (!item) throw new NotFoundError('Devolución no encontrada');
  const header = raw[0] ?? {};

  const itemsQb = itemRepo.createQueryBuilder('ri')
    .leftJoin('products', 'p', 'p.id::text = ri.product_id::text')
    .leftJoin('lots', 'l', 'l.id::text = ri.lot_id::text')
    .addSelect('p.name', 'productName')
    .addSelect('p.sku', 'productSku')
    .addSelect('l.code', 'lotCode')
    .where('ri.return_order_id = :id', { id })
    .orderBy('ri.created_at', 'ASC');

  const { entities: itemEntities, raw: itemRaw } = await itemsQb.getRawAndEntities();
  const items = itemEntities.map((e, i) => ({
    ...e,
    productName: itemRaw[i]?.productName ?? null,
    productSku: itemRaw[i]?.productSku ?? null,
    lotCode: itemRaw[i]?.lotCode ?? null,
  }));

  return {
    ...item,
    customerName: header.customerName ?? null,
    originalOrderNumber: header.originalOrderNumber ?? null,
    items,
  };
}

export async function create(data: any) {
  const r = repo.create({
    customerId: data.customerId,
    shipmentId: data.shipmentId,
    shipmentStopId: data.shipmentStopId,
    originalOrderId: data.originalOrderId,
    warehouseId: data.warehouseId,
    kind: data.kind ?? 'commercial',
    status: 'draft',
    notes: data.notes,
  });
  if (data.items?.length) {
    r.items = data.items.map((i: any) => itemRepo.create({
      productId: i.productId,
      lotId: i.lotId,
      quantity: i.quantity,
      reasonCode: i.reasonCode,
      condition: i.condition ?? 'resellable',
    }));
  }
  const saved = await repo.save(r);
  eventBus.emit(ReturnEvents.CREATED, saved);
  logger.info({ action: 'create', returnId: saved.id, orderId: saved.originalOrderId }, 'Return created');
  return saved;
}

async function transitionTo(id: string, newStatus: string, event: string, patch: Partial<ReturnOrderEntity> = {}) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'return');
  item.status = newStatus;
  Object.assign(item, patch);
  const saved = await repo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', returnId: id, from, to: newStatus }, 'Return status updated');
  return saved;
}

export async function confirm(id: string) { return transitionTo(id, 'confirmed', ReturnEvents.CONFIRMED); }

export async function receive(id: string) {
  const saved = await transitionTo(id, 'received', ReturnEvents.RECEIVED, { receivedAt: new Date() });
  // Inbound movement for every item to warehouse (kind=returns location if available). Defer location selection to inspect.
  if (!saved.warehouseId) return saved;
  for (const it of saved.items) {
    try {
      await createMovement({
        type: 'return',
        productId: it.productId,
        destWarehouseId: saved.warehouseId,
        quantity: it.quantity,
        lotId: it.lotId ?? null,
        reasonCode: 'return_received',
        referenceType: 'return_order',
        referenceId: saved.id,
      });
    } catch (e) {
      logger.warn({ action: 'create', returnId: saved.id, itemId: it.id, err: e }, 'Return inventory movement failed');
    }
  }
  return saved;
}

export async function inspect(id: string, data: { lines: Array<{ itemId: string; condition: string; destLocationId?: string }> }) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, 'inspected', 'return');

  const itemsById = new Map(item.items.map((i) => [i.id, i]));
  for (const line of data.lines) {
    const it = itemsById.get(line.itemId);
    if (!it) throw new BusinessLogicError('LINE_NOT_FOUND', `El ítem ${line.itemId} no pertenece a esta devolución`);
    it.condition = line.condition;
    if (line.destLocationId) it.destLocationId = line.destLocationId;
    await itemRepo.save(it);
  }

  item.status = 'inspected';
  const saved = await repo.save(item);
  eventBus.emit(ReturnEvents.INSPECTED, saved);
  logger.info({ action: 'transition', returnId: id, from, to: 'inspected' }, 'Return status updated');
  return saved;
}

export async function close(id: string) { return transitionTo(id, 'closed', ReturnEvents.CLOSED); }
export async function cancel(id: string) { return transitionTo(id, 'cancelled', ReturnEvents.CANCELLED); }
