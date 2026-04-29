import { AppDataSource } from '../../config/data-source';
import { PickingTaskEntity } from './data_access/picking-task.entity';
import { PickingTaskItemEntity } from './data_access/picking-task-item.entity';
import { StockReservationEntity } from '../inventory/data_access/stock-reservation.entity';
import { OrderEntity } from '../orders/data_access/order.entity';
import { OrderItemEntity } from '../orders/data_access/order-item.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import { Not } from 'typeorm';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { PickingEvents } from './picking.events';
import * as ordersService from '../orders/orders.service';
import { logger } from '../../common/logger';

const taskRepo = AppDataSource.getRepository(PickingTaskEntity);
const itemRepo = AppDataSource.getRepository(PickingTaskItemEntity);
const reservationRepo = AppDataSource.getRepository(StockReservationEntity);
const orderRepo = AppDataSource.getRepository(OrderEntity);
const orderItemRepo = AppDataSource.getRepository(OrderItemEntity);

const TRANSITIONS: TransitionMap<string> = {
  pending: ['assigned', 'in_progress', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['picked', 'cancelled'],
  picked: ['staged', 'cancelled'],
  staged: [],
  cancelled: [],
};

const PICK_COLUMNS: ColumnMap = {
  orderId:      { type: 'enum',   column: 'orderId' },
  status:       { type: 'enum',   column: 'status' },
  warehouseId:  { type: 'enum',   column: 'warehouseId' },
  assignedTo:   { type: 'enum',   column: 'assignedTo' },
  priority:     { type: 'number', column: 'priority' },
  startedAt:    { type: 'date',   column: 'startedAt' },
  completedAt:  { type: 'date',   column: 'completedAt' },
  createdAt:    { type: 'date',   column: 'createdAt' },
  warehouseName:  { type: 'string', sql: 'w.name' },
  assignedToName: { type: 'string', sql: "TRIM(CONCAT(u.first_name, ' ', u.last_name))" },
};
const PICK_SORTABLE: SortableMap = {
  priority: 't.priority', createdAt: 't.createdAt', status: 't.status',
  startedAt: 't.startedAt', completedAt: 't.completedAt',
  warehouseName: 'w.name',
};
const PICK_SEARCH = ['w.name', "TRIM(CONCAT(u.first_name, ' ', u.last_name))"];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = taskRepo.createQueryBuilder('t')
    .leftJoin('orders', 'o', 'o.id::text = t.order_id::text')
    .leftJoin('warehouses', 'w', 'w.id::text = t.warehouse_id::text')
    .leftJoin('users', 'u', 'u.id::text = t.assigned_to::text')
    .addSelect('o.number', 'orderNumber')
    .addSelect('w.name', 'warehouseName')
    .addSelect("TRIM(CONCAT(u.first_name, ' ', u.last_name))", 'assignedToName');

  query.applyTo(qb, 't', PICK_COLUMNS, PICK_SORTABLE, PICK_SEARCH, {
    field: 'priority', direction: 'DESC',
  });

  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    orderNumber: raw[i]?.orderNumber ?? null,
    warehouseName: raw[i]?.warehouseName ?? null,
    assignedToName: raw[i]?.assignedToName?.trim() || null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const qb = taskRepo.createQueryBuilder('t')
    .leftJoin('orders', 'o', 'o.id::text = t.order_id::text')
    .leftJoin('warehouses', 'w', 'w.id::text = t.warehouse_id::text')
    .leftJoin('users', 'u', 'u.id::text = t.assigned_to::text')
    .addSelect('o.number', 'orderNumber')
    .addSelect('w.name', 'warehouseName')
    .addSelect("TRIM(CONCAT(u.first_name, ' ', u.last_name))", 'assignedToName')
    .where('t.id = :id', { id });

  const { entities, raw } = await qb.getRawAndEntities();
  const entity = entities[0];
  if (!entity) throw new NotFoundError('Tarea de picking no encontrada');
  const row = raw[0];

  const items = await itemRepo.find({ where: { pickingTaskId: id } });

  const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))];
  const lotIds = [...new Set(items.map((i) => i.lotId).filter(Boolean) as string[])];
  const locationIds = [...new Set(items.map((i) => i.sourceLocationId).filter(Boolean) as string[])];

  const [products, lots, locations] = await Promise.all([
    productIds.length
      ? AppDataSource.query(
          `SELECT id::text AS id, name FROM products WHERE id::text = ANY($1) AND deleted_at IS NULL`,
          [productIds],
        )
      : Promise.resolve([]),
    lotIds.length
      ? AppDataSource.query(
          `SELECT id::text AS id, code FROM lots WHERE id::text = ANY($1) AND deleted_at IS NULL`,
          [lotIds],
        )
      : Promise.resolve([]),
    locationIds.length
      ? AppDataSource.query(
          `SELECT id::text AS id, code FROM warehouse_locations WHERE id::text = ANY($1) AND deleted_at IS NULL`,
          [locationIds],
        )
      : Promise.resolve([]),
  ]);

  const productMap = new Map<string, string>(products.map((p: { id: string; name: string }) => [p.id, p.name]));
  const lotMap = new Map<string, string>(lots.map((l: { id: string; code: string }) => [l.id, l.code]));
  const locationMap = new Map<string, string>(locations.map((l: { id: string; code: string }) => [l.id, l.code]));

  const enrichedItems = items.map((i) => ({
    ...i,
    productName: productMap.get(i.productId) ?? null,
    lotCode: i.lotId ? (lotMap.get(i.lotId) ?? null) : null,
    locationCode: i.sourceLocationId ? (locationMap.get(i.sourceLocationId) ?? null) : null,
  }));

  return {
    ...entity,
    items: enrichedItems,
    orderNumber: row?.orderNumber ?? null,
    warehouseName: row?.warehouseName ?? null,
    assignedToName: row?.assignedToName?.trim() || null,
  };
}

export async function create(data: any) {
  const task = taskRepo.create({
    orderId: data.orderId,
    shipmentId: data.shipmentId,
    warehouseId: data.warehouseId,
    assignedTo: data.assignedTo,
    priority: data.priority ?? 0,
    status: data.assignedTo ? 'assigned' : 'pending',
  });

  if (data.items?.length) {
    task.items = data.items.map((i: any) =>
      itemRepo.create({
        orderItemId: i.orderItemId,
        productId: i.productId,
        lotId: i.lotId,
        sourceLocationId: i.sourceLocationId,
        requestedQty: i.requestedQty,
        pickedQty: 0,
        status: 'pending',
      }),
    );
  }

  const saved = await taskRepo.save(task);
  eventBus.emit(PickingEvents.CREATED, saved);
  logger.info({ action: 'create', pickingId: saved.id, orderId: saved.orderId, warehouseId: saved.warehouseId, assignedTo: saved.assignedTo, status: saved.status }, 'Picking task created');
  return saved;
}

export async function createForOrder(orderId: string) {
  const existing = await taskRepo.findOne({ where: { orderId, status: Not('cancelled') } });
  if (existing) return existing;

  const order = await orderRepo.findOne({ where: { id: orderId }, relations: ['items'] });
  if (!order) throw new NotFoundError('Pedido no encontrado');

  // Resolve warehouse from first reservation
  const firstReservation = await reservationRepo.findOne({ where: { orderId, status: 'active' } });
  const warehouseId = firstReservation?.warehouseId;
  if (!warehouseId) {
    throw new BusinessLogicError('NO_RESERVATION', 'No se puede crear una tarea de picking sin reservas activas');
  }

  const reservations = await reservationRepo.find({ where: { orderId, status: 'active' } });

  const task = taskRepo.create({
    orderId,
    warehouseId,
    priority: 0,
    status: 'pending',
  });

  task.items = reservations.map((r) =>
    itemRepo.create({
      productId: r.productId,
      lotId: r.lotId ?? undefined,
      sourceLocationId: r.locationId ?? undefined,
      requestedQty: r.quantity,
      pickedQty: 0,
      status: 'pending',
    }),
  );

  const saved = await taskRepo.save(task);

  // link reservations to task items by productId+lotId
  const itemsByKey = new Map<string, PickingTaskItemEntity>();
  for (const it of saved.items) itemsByKey.set(`${it.productId}:${it.lotId ?? ''}`, it);
  for (const r of reservations) {
    const match = itemsByKey.get(`${r.productId}:${r.lotId ?? ''}`);
    if (match) {
      r.pickingTaskItemId = match.id;
      await reservationRepo.save(r);
    }
  }

  eventBus.emit(PickingEvents.CREATED, saved);
  logger.info({ action: 'create', pickingId: saved.id, orderId, warehouseId: saved.warehouseId, itemCount: saved.items.length }, 'Picking task auto-created for order');
  return saved;
}

async function transitionTo(id: string, newStatus: string, event: string, patch: Partial<PickingTaskEntity> = {}) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'picking_task');
  item.status = newStatus;
  Object.assign(item, patch);
  const saved = await taskRepo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', pickingId: id, from, to: newStatus }, 'Picking task status updated');
  return saved;
}

export async function assign(id: string, userId: string) {
  return transitionTo(id, 'assigned', PickingEvents.ASSIGNED, { assignedTo: userId });
}

export async function start(id: string) {
  return transitionTo(id, 'in_progress', PickingEvents.STARTED, { startedAt: new Date() });
}

export async function pickItem(taskId: string, itemId: string, data: { pickedQty: number; lotId?: string; locationId?: string; short?: boolean }) {
  const item = await itemRepo.findOne({ where: { id: itemId, pickingTaskId: taskId } });
  if (!item) throw new NotFoundError('Ítem de tarea de picking no encontrado');

  item.pickedQty = Number(data.pickedQty);
  if (data.lotId) item.lotId = data.lotId;
  if (data.locationId) item.sourceLocationId = data.locationId;

  if (data.short || Number(data.pickedQty) < Number(item.requestedQty)) {
    item.status = 'short';
    eventBus.emit(PickingEvents.SHORT, { taskId, itemId });
  } else {
    item.status = 'picked';
  }
  const saved = await itemRepo.save(item);
  eventBus.emit(PickingEvents.ITEM_PICKED, saved);
  logger.info({ action: 'update', pickingId: taskId, pickingItemId: itemId, pickedQty: saved.pickedQty, requestedQty: saved.requestedQty, status: saved.status }, 'Picking item picked');
  return saved;
}

export async function complete(id: string) {
  return transitionTo(id, 'picked', PickingEvents.COMPLETED, { completedAt: new Date() });
}

export async function stage(id: string) {
  return transitionTo(id, 'staged', PickingEvents.STAGED);
}

export async function cancel(id: string) {
  return transitionTo(id, 'cancelled', PickingEvents.CANCELLED);
}

// Listener handlers

export async function onOrderStockReserved(payload: { id: string }) {
  // Auto-create picking task if warehouse.metadata.autoPicking is truthy; default on for distribuidoras
  try {
    await createForOrder(payload.id);
  } catch (e) {
    logger.error({ err: e, orderId: payload.id }, 'auto-picking create failed for order');
  }
}

export async function onPickingCompleted(payload: { id: string; orderId?: string }) {
  if (!payload.orderId) {
    const task = await taskRepo.findOne({ where: { id: payload.id } });
    if (!task?.orderId) return;
    payload.orderId = task.orderId;
  }
  try {
    await ordersService.readyToDispatch(payload.orderId);
  } catch (e) {
    logger.error({ err: e, orderId: payload.orderId }, 'failed to mark order ready_to_dispatch');
  }
}
