import { AppDataSource } from '../../config/data-source';
import { ShipmentEntity } from './data_access/shipment.entity';
import { ShipmentStopEntity } from './data_access/shipment-stop.entity';
import { OrderEntity } from '../orders/data_access/order.entity';
import { VehicleEntity } from '../vehicles/data_access/vehicle.entity';
import { DriverEntity } from '../drivers/data_access/driver.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { ShipmentEvents } from './shipments.events';
import * as ordersService from '../orders/orders.service';
import { logger } from '../../common/logger';

const shipRepo = AppDataSource.getRepository(ShipmentEntity);
const stopRepo = AppDataSource.getRepository(ShipmentStopEntity);
const orderRepo = AppDataSource.getRepository(OrderEntity);
const vehicleRepo = AppDataSource.getRepository(VehicleEntity);
const driverRepo = AppDataSource.getRepository(DriverEntity);

async function assertVehicleAvailable(vehicleId?: string | null) {
  if (!vehicleId) return;
  const vehicle = await vehicleRepo.findOne({ where: { id: vehicleId } });
  if (!vehicle) throw new NotFoundError('Vehículo no encontrado');
  if (vehicle.status !== 'active') {
    throw new BusinessLogicError(
      'VEHICLE_NOT_AVAILABLE',
      `El vehículo no está disponible (estado=${vehicle.status})`,
      { vehicleId, status: vehicle.status },
    );
  }
}

async function assertDriverValid(driverId?: string | null) {
  if (!driverId) return;
  const driver = await driverRepo.findOne({ where: { id: driverId } });
  if (!driver) throw new NotFoundError('Chofer no encontrado');
  if (driver.status !== 'active') {
    throw new BusinessLogicError(
      'DRIVER_NOT_AVAILABLE',
      `El chofer no está disponible (estado=${driver.status})`,
      { driverId, status: driver.status },
    );
  }
  if (driver.licenseExpires) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(driver.licenseExpires);
    if (exp < today) {
      throw new BusinessLogicError(
        'DRIVER_LICENSE_EXPIRED',
        `La licencia del chofer venció el ${driver.licenseExpires}`,
        { driverId, licenseExpires: driver.licenseExpires },
      );
    }
  }
}

const SHIPMENT_TRANSITIONS: TransitionMap<string> = {
  planned: ['loaded', 'cancelled'],
  loaded: ['in_transit', 'cancelled'],
  in_transit: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const STOP_TRANSITIONS: TransitionMap<string> = {
  pending: ['arrived', 'not_visited'],
  arrived: ['delivered', 'partial', 'rejected'],
  delivered: [],
  partial: [],
  rejected: [],
  not_visited: [],
};

const SHIPMENT_COLUMNS: ColumnMap = {
  status:       { type: 'enum',   column: 'status' },
  warehouseId:  { type: 'enum',   column: 'warehouseId' },
  vehicleId:    { type: 'enum',   column: 'vehicleId' },
  driverId:     { type: 'enum',   column: 'driverId' },
  plannedDate:  { type: 'date',   column: 'plannedDate' },
  createdAt:    { type: 'date',   column: 'createdAt' },
  warehouseName:{ type: 'string', sql: 'w.name' },
  driverName:   { type: 'string', sql: 'dr.full_name' },
  vehiclePlate: { type: 'string', sql: 've.plate' },
};
const SHIPMENT_SORTABLE: SortableMap = {
  plannedDate: 's.plannedDate',
  status: 's.status',
  createdAt: 's.createdAt',
  warehouseName: 'w.name',
  driverName: 'dr.full_name',
};
const SHIPMENT_SEARCH = ['w.name', 'dr.full_name', 've.plate'];

function buildShipmentsQB() {
  return shipRepo.createQueryBuilder('s')
    .leftJoin('warehouses', 'w', 'w.id::text = s.warehouse_id::text')
    .leftJoin('drivers', 'dr', 'dr.id::text = s.driver_id::text')
    .leftJoin('vehicles', 've', 've.id::text = s.vehicle_id::text');
}

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildShipmentsQB()
    .addSelect('w.name', 'warehouseName')
    .addSelect('dr.full_name', 'driverName')
    .addSelect('ve.plate', 'vehiclePlate');

  query.applyTo(qb, 's', SHIPMENT_COLUMNS, SHIPMENT_SORTABLE, SHIPMENT_SEARCH, {
    field: 'plannedDate', direction: 'DESC',
  });

  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    warehouseName: raw[i]?.warehouseName ?? null,
    driverName: raw[i]?.driverName ?? null,
    vehiclePlate: raw[i]?.vehiclePlate ?? null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function findSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = buildShipmentsQB().select('COUNT(s.id)', 'total');
  query.applyFilters(qb, 's', SHIPMENT_COLUMNS, SHIPMENT_SEARCH);
  const totals = await qb.getRawOne();

  const byStatusQb = buildShipmentsQB()
    .select('s.status', 'status')
    .addSelect('COUNT(s.id)', 'count')
    .groupBy('s.status');
  query.applyFilters(byStatusQb, 's', SHIPMENT_COLUMNS, SHIPMENT_SEARCH);
  const byStatusRows = await byStatusQb.getRawMany();

  return {
    total: Number(totals?.total ?? 0),
    byStatus: byStatusRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = Number(r.count); return acc;
    }, {}),
  };
}

export async function findById(id: string) {
  const shipmentQb = buildShipmentsQB()
    .addSelect('w.name', 'warehouseName')
    .addSelect('dr.full_name', 'driverName')
    .addSelect('ve.plate', 'vehiclePlate')
    .where('s.id = :id', { id });

  const shipmentRes = await shipmentQb.getRawAndEntities();
  const shipment = shipmentRes.entities[0];
  if (!shipment) throw new NotFoundError('Envío no encontrado');
  const shipmentRaw = shipmentRes.raw[0] ?? {};

  const stopsQb = stopRepo.createQueryBuilder('st')
    .leftJoin('customers', 'c', 'c.id::text = st.customer_id::text')
    .leftJoin('orders', 'o', 'o.id::text = st.order_id::text')
    .addSelect('COALESCE(c.commercial_name, c.legal_name)', 'customerName')
    .addSelect('o.number', 'orderNumber')
    .where('st.shipment_id = :id', { id })
    .orderBy('st.sequence', 'ASC');

  const { entities: stopEntities, raw: stopRaw } = await stopsQb.getRawAndEntities();
  const stops = stopEntities.map((e, i) => ({
    ...e,
    customerName: stopRaw[i]?.customerName ?? null,
    orderNumber: stopRaw[i]?.orderNumber ?? null,
  }));

  return {
    ...shipment,
    warehouseName: shipmentRaw.warehouseName ?? null,
    driverName: shipmentRaw.driverName ?? null,
    vehiclePlate: shipmentRaw.vehiclePlate ?? null,
    stops,
  };
}

export async function create(data: any) {
  await assertVehicleAvailable(data.vehicleId);
  await assertDriverValid(data.driverId);
  const saved = await shipRepo.save(shipRepo.create({
    warehouseId: data.warehouseId,
    vehicleId: data.vehicleId,
    driverId: data.driverId,
    dispatchSheetId: data.dispatchSheetId,
    plannedDate: data.plannedDate,
    status: 'planned',
  }));
  eventBus.emit(ShipmentEvents.CREATED, saved);
  logger.info({ action: 'create', shipmentId: saved.id, warehouseId: saved.warehouseId, vehicleId: saved.vehicleId, driverId: saved.driverId, plannedDate: saved.plannedDate }, 'Shipment created');
  return saved;
}

export async function update(id: string, data: any) {
  const item = await findById(id);
  if (item.status !== 'planned') {
    throw new BusinessLogicError('INVALID_STATE', 'El envío solo puede actualizarse en estado planificado');
  }
  if (data.vehicleId && data.vehicleId !== item.vehicleId) await assertVehicleAvailable(data.vehicleId);
  if (data.driverId && data.driverId !== item.driverId) await assertDriverValid(data.driverId);
  Object.assign(item, data);
  const saved = await shipRepo.save(item);
  logger.info({ action: 'update', shipmentId: id }, 'Shipment updated');
  return saved;
}

async function transitionShipment(id: string, newStatus: string, event: string, patch: Partial<ShipmentEntity> = {}) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(SHIPMENT_TRANSITIONS, from, newStatus, 'shipment');
  item.status = newStatus;
  Object.assign(item, patch);
  const saved = await shipRepo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', shipmentId: id, from, to: newStatus }, 'Shipment status updated');
  return saved;
}

export async function load(id: string) {
  return transitionShipment(id, 'loaded', ShipmentEvents.LOADED);
}

export async function depart(id: string) {
  const saved = await transitionShipment(id, 'in_transit', ShipmentEvents.DEPARTED, { departedAt: new Date() });
  // Transition member orders to dispatched
  const stops = await stopRepo.find({ where: { shipmentId: id } });
  const departLogger = logger;
  for (const stop of stops) {
    try {
      await ordersService.dispatch(stop.orderId);
    } catch (e) {
      departLogger.warn({ action: 'dispatch_order', shipmentId: id, orderId: stop.orderId, err: e }, 'Failed to dispatch order on shipment departure');
    }
  }
  return saved;
}

export async function complete(id: string) {
  return transitionShipment(id, 'completed', ShipmentEvents.COMPLETED, { returnedAt: new Date() });
}

export async function cancel(id: string) {
  return transitionShipment(id, 'cancelled', ShipmentEvents.CANCELLED);
}

// Stops

export async function addStop(shipmentId: string, data: any) {
  const shipment = await findById(shipmentId);
  if (shipment.status !== 'planned' && shipment.status !== 'loaded') {
    throw new BusinessLogicError('INVALID_STATE', 'Solo se pueden agregar paradas cuando el envío está planificado o cargado');
  }
  const stop = stopRepo.create({ ...data, shipmentId, status: 'pending' });
  const saved = await stopRepo.save(stop) as unknown as ShipmentStopEntity;
  shipment.totalStops = (shipment.totalStops ?? 0) + 1;
  await shipRepo.save(shipment);
  // update order link
  const order = await orderRepo.findOne({ where: { id: data.orderId } });
  if (order) {
    order.shipmentId = shipmentId;
    await orderRepo.save(order);
  }
  logger.info({ action: 'create', shipmentId, shipmentStopId: saved.id, orderId: saved.orderId, sequence: saved.sequence }, 'Shipment stop added');
  return saved;
}

async function findStop(shipmentId: string, stopId: string) {
  const stop = await stopRepo.findOne({ where: { id: stopId, shipmentId } });
  if (!stop) throw new NotFoundError('Parada de envío no encontrada');
  return stop;
}

async function transitionStop(shipmentId: string, stopId: string, newStatus: string, event: string, patch: Partial<ShipmentStopEntity> = {}) {
  const stop = await findStop(shipmentId, stopId);
  const from = stop.status;
  assertTransition(STOP_TRANSITIONS, from, newStatus, 'shipment_stop');
  stop.status = newStatus;
  Object.assign(stop, patch);
  const saved = await stopRepo.save(stop);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', shipmentId, shipmentStopId: stopId, from, to: newStatus }, 'Shipment stop status updated');
  return saved;
}

export async function arriveStop(shipmentId: string, stopId: string) {
  return transitionStop(shipmentId, stopId, 'arrived', ShipmentEvents.STOP_ARRIVED, { arrivedAt: new Date() });
}

export async function deliverStop(shipmentId: string, stopId: string, data: any) {
  const saved = await transitionStop(shipmentId, stopId, 'delivered', ShipmentEvents.STOP_DELIVERED, {
    signatureUrl: data.signatureUrl,
    notes: data.notes,
    lat: data.lat,
    lng: data.lng,
    departedAt: new Date(),
  });
  const deliverLogger = logger;
  try {
    await ordersService.deliver(saved.orderId);
  } catch (e) {
    deliverLogger.warn({ action: 'deliver_order', shipmentId, shipmentStopId: stopId, orderId: saved.orderId, err: e }, 'Failed to mark order delivered on stop delivery');
  }
  return saved;
}

export async function rejectStop(shipmentId: string, stopId: string, data: any) {
  const saved = await transitionStop(shipmentId, stopId, 'rejected', ShipmentEvents.STOP_REJECTED, {
    notes: data.reason ? `${data.reason}${data.notes ? ' - ' + data.notes : ''}` : data.notes,
    departedAt: new Date(),
  });
  return saved;
}

export async function partialStop(shipmentId: string, stopId: string, data: any) {
  const saved = await transitionStop(shipmentId, stopId, 'partial', ShipmentEvents.STOP_PARTIAL, {
    notes: data.notes ?? null,
    departedAt: new Date(),
  });
  return saved;
}
