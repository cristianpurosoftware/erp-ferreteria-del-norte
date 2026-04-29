import { AppDataSource } from '../../config/data-source';
import { DeliveryNoteEntity } from './data_access/delivery-note.entity';
import { DeliveryNoteItemEntity } from './data_access/delivery-note-item.entity';
import { ShipmentStopEntity } from '../shipments/data_access/shipment-stop.entity';
import { OrderEntity } from '../orders/data_access/order.entity';
import { OrderItemEntity } from '../orders/data_access/order-item.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { DeliveryNoteEvents } from './delivery-notes.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(DeliveryNoteEntity);
const itemRepo = AppDataSource.getRepository(DeliveryNoteItemEntity);

const TRANSITIONS: TransitionMap<string> = {
  draft: ['issued', 'cancelled'],
  issued: ['invoiced', 'cancelled'],
  invoiced: [],
  cancelled: [],
};

const DN_COLUMNS: ColumnMap = {
  status:       { type: 'enum',   column: 'status' },
  customerId:   { type: 'enum',   column: 'customerId' },
  warehouseId:  { type: 'enum',   column: 'warehouseId' },
  driverId:     { type: 'enum',   column: 'driverId' },
  vehicleId:    { type: 'enum',   column: 'vehicleId' },
  invoiceType:  { type: 'enum',   column: 'invoiceType' },
  number:       { type: 'string', column: 'number' },
  issueDate:    { type: 'date',   column: 'issueDate' },
  createdAt:    { type: 'date',   column: 'createdAt' },
  customerName: { type: 'string', sql: 'cu.legal_name' },
  driverName:   { type: 'string', sql: 'dr.full_name' },
  vehiclePlate: { type: 'string', sql: 've.plate' },
};
const DN_SORTABLE: SortableMap = {
  issueDate: 'd.issueDate', status: 'd.status', number: 'd.number',
  createdAt: 'd.createdAt', customerName: 'cu.legal_name',
};
const DN_SEARCH = ['d.number', 'cu.legal_name', 'dr.full_name', 've.plate'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('d')
    .leftJoin('customers', 'cu', 'cu.id::text = d.customer_id::text')
    .leftJoin('drivers', 'dr', 'dr.id::text = d.driver_id::text')
    .leftJoin('vehicles', 've', 've.id::text = d.vehicle_id::text')
    .addSelect('cu.legal_name', 'customerName')
    .addSelect('dr.full_name', 'driverName')
    .addSelect('ve.plate', 'vehiclePlate');

  query.applyTo(qb, 'd', DN_COLUMNS, DN_SORTABLE, DN_SEARCH, {
    field: 'issueDate', direction: 'DESC',
  });

  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    customerName: raw[i]?.customerName ?? null,
    driverName: raw[i]?.driverName ?? null,
    vehiclePlate: raw[i]?.vehiclePlate ?? null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id }, relations: ['items'] });
  if (!item) throw new NotFoundError('Remito de entrega no encontrado');
  return item;
}

export async function create(data: any) {
  const dn = repo.create({
    number: data.number,
    salesPoint: data.salesPoint,
    invoiceType: data.invoiceType ?? 'X',
    issueDate: data.issueDate,
    customerId: data.customerId,
    orderId: data.orderId,
    shipmentStopId: data.shipmentStopId,
    warehouseId: data.warehouseId,
    driverId: data.driverId,
    vehicleId: data.vehicleId,
    status: 'draft',
  });
  dn.items = data.items.map((i: any) => itemRepo.create({
    productId: i.productId,
    lotId: i.lotId,
    orderItemId: i.orderItemId,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
  }));
  const saved = await repo.save(dn);
  eventBus.emit(DeliveryNoteEvents.CREATED, saved);
  logger.info({ action: 'create', deliveryNoteId: saved.id, number: saved.number, customerId: saved.customerId, issueDate: saved.issueDate }, 'Delivery note created');
  return saved;
}

async function transitionTo(id: string, newStatus: string, event: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'delivery_note');
  item.status = newStatus;
  const saved = await repo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', deliveryNoteId: id, from, to: newStatus }, 'Delivery note status updated');
  return saved;
}

export async function issue(id: string) { return transitionTo(id, 'issued', DeliveryNoteEvents.ISSUED); }
export async function cancel(id: string) { return transitionTo(id, 'cancelled', DeliveryNoteEvents.CANCELLED); }

export async function markInvoiced(id: string, invoiceId: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, 'invoiced', 'delivery_note');
  item.status = 'invoiced';
  item.invoiceId = invoiceId;
  const saved = await repo.save(item);
  eventBus.emit(DeliveryNoteEvents.INVOICED, saved);
  logger.info({ action: 'transition', deliveryNoteId: id, from, to: 'invoiced', invoiceId }, 'Delivery note status updated');
  return saved;
}

export async function createFromShipmentStop(stopId: string) {
  const stopRepo = AppDataSource.getRepository(ShipmentStopEntity);
  const stop = await stopRepo.findOne({ where: { id: stopId } });
  if (!stop) throw new NotFoundError('Parada de envío no encontrada');

  const orderRepo = AppDataSource.getRepository(OrderEntity);
  const itemRepoO = AppDataSource.getRepository(OrderItemEntity);
  const order = await orderRepo.findOne({ where: { id: stop.orderId } });
  if (!order) throw new NotFoundError('Pedido no encontrado');
  const orderItems = await itemRepoO.find({ where: { orderId: stop.orderId } });

  const number = `R-${Date.now()}`;
  const dn = await create({
    number,
    issueDate: new Date().toISOString().slice(0, 10),
    customerId: stop.customerId,
    orderId: stop.orderId,
    shipmentStopId: stop.id,
    items: orderItems.map((oi) => ({
      productId: oi.productId,
      orderItemId: oi.id,
      quantity: oi.quantity,
      unitPrice: oi.unitPrice,
    })),
  });

  // auto-issue + link to stop
  const issued = await issue(dn.id);
  stop.deliveryNoteId = issued.id;
  await stopRepo.save(stop);
  return issued;
}
