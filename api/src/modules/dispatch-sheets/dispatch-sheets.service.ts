import { AppDataSource } from '../../config/data-source';
import { DispatchSheetEntity } from './data_access/dispatch-sheet.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { DispatchSheetEvents } from './dispatch-sheets.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(DispatchSheetEntity);

const TRANSITIONS: TransitionMap<string> = {
  draft: ['printed', 'closed'],
  printed: ['dispatched', 'closed'],
  dispatched: ['closed'],
  closed: [],
};

const DS_COLUMNS: ColumnMap = {
  status:       { type: 'enum',   column: 'status' },
  warehouseId:  { type: 'enum',   column: 'warehouseId' },
  driverId:     { type: 'enum',   column: 'driverId' },
  vehicleId:    { type: 'enum',   column: 'vehicleId' },
  date:         { type: 'date',   column: 'date' },
  createdAt:    { type: 'date',   column: 'createdAt' },
  warehouseName:{ type: 'string', sql: 'w.name' },
  driverName:   { type: 'string', sql: 'dr.full_name' },
  vehiclePlate: { type: 'string', sql: 've.plate' },
};
const DS_SORTABLE: SortableMap = {
  date: 'd.date', status: 'd.status', createdAt: 'd.createdAt',
  warehouseName: 'w.name', driverName: 'dr.full_name',
};
const DS_SEARCH = ['w.name', 'dr.full_name', 've.plate'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('d')
    .leftJoin('warehouses', 'w', 'w.id::text = d.warehouse_id::text')
    .leftJoin('drivers', 'dr', 'dr.id::text = d.driver_id::text')
    .leftJoin('vehicles', 've', 've.id::text = d.vehicle_id::text')
    .addSelect('w.name', 'warehouseName')
    .addSelect('dr.full_name', 'driverName')
    .addSelect('ve.plate', 'vehiclePlate');

  query.applyTo(qb, 'd', DS_COLUMNS, DS_SORTABLE, DS_SEARCH, {
    field: 'date', direction: 'DESC',
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

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Hoja de despacho no encontrada');
  return item;
}

export async function create(data: any) {
  const saved = await repo.save(repo.create({ ...data, status: 'draft' })) as unknown as DispatchSheetEntity;
  eventBus.emit(DispatchSheetEvents.CREATED, saved);
  logger.info({ action: 'create', dispatchSheetId: saved.id, warehouseId: saved.warehouseId, driverId: saved.driverId, vehicleId: saved.vehicleId, date: saved.date }, 'Dispatch sheet created');
  return saved;
}

export async function update(id: string, data: any) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  logger.info({ action: 'update', dispatchSheetId: id }, 'Dispatch sheet updated');
  return saved;
}

async function transitionTo(id: string, newStatus: string, event: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'dispatch_sheet');
  item.status = newStatus;
  const saved = await repo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', dispatchSheetId: id, from, to: newStatus }, 'Dispatch sheet status updated');
  return saved;
}

// print() transitions draft → printed on first call, and is idempotent on
// reprints (printed/dispatched/closed): emits the event without changing
// status so the user can reprint a dispatch sheet that has already left
// the warehouse.
export async function print(id: string) {
  const item = await findById(id);
  if (item.status === 'draft') {
    return transitionTo(id, 'printed', DispatchSheetEvents.PRINTED);
  }
  eventBus.emit(DispatchSheetEvents.PRINTED, item);
  return item;
}
export async function dispatch(id: string) { return transitionTo(id, 'dispatched', DispatchSheetEvents.DISPATCHED); }
export async function close(id: string) { return transitionTo(id, 'closed', DispatchSheetEvents.CLOSED); }

// Aggregated read for the printable dispatch sheet document. Returns the
// sheet with its vehicle/driver/warehouse, plus all shipments attached and
// every stop enriched with customer / address / order / delivery note.
export async function getPrintData(id: string) {
  const headerRows: any[] = await AppDataSource.query(
    `SELECT
       d.id, d.number, d.date, d.status, d.notes,
       d.vehicle_id AS "vehicleId", d.driver_id AS "driverId", d.warehouse_id AS "warehouseId",
       ve.plate AS "vehiclePlate", ve.model AS "vehicleModel",
       ve.capacity_kg AS "vehicleCapacityKg", ve.capacity_m3 AS "vehicleCapacityM3",
       dr.full_name AS "driverFullName", dr.dni AS "driverDni",
       dr.phone AS "driverPhone", dr.license_number AS "driverLicenseNumber",
       w.name AS "warehouseName", w.branch_id AS "warehouseBranchId"
     FROM dispatch_sheets d
     LEFT JOIN vehicles ve ON ve.id = d.vehicle_id
     LEFT JOIN drivers dr ON dr.id = d.driver_id
     LEFT JOIN warehouses w ON w.id = d.warehouse_id
     WHERE d.id = $1 AND d.deleted_at IS NULL
     LIMIT 1`,
    [id],
  );

  const row = headerRows[0];
  if (!row) throw new NotFoundError('Hoja de despacho no encontrada');

  const shipmentsRaw: any[] = await AppDataSource.query(
    `SELECT id, number, planned_date AS "plannedDate", status,
            total_stops AS "totalStops", total_weight_kg AS "totalWeightKg"
     FROM shipments
     WHERE dispatch_sheet_id = $1 AND deleted_at IS NULL
     ORDER BY number ASC`,
    [id],
  );

  const shipmentIds = shipmentsRaw.map((s) => s.id);
  const stopsByShipment: Record<string, any[]> = {};

  if (shipmentIds.length) {
    const stopsRaw: any[] = await AppDataSource.query(
      `SELECT
         ss.id, ss.shipment_id AS "shipmentId", ss.sequence, ss.status,
         ss.planned_window AS "plannedWindow", ss.notes,
         c.id AS "customerId", c.legal_name AS "legalName", c.commercial_name AS "commercialName",
           c.tax_id AS "taxId", c.phone AS "customerPhone",
         a.id AS "addressId", a.street, a.city, a.province, a.postal_code AS "postalCode",
           a.notes AS "addressNotes",
         o.id AS "orderId", o.number AS "orderNumber", o.status AS "orderStatus",
           o.total AS "orderTotal", o.notes AS "orderNotes",
           o.estimated_delivery_date AS "estimatedDeliveryDate",
         dn.id AS "deliveryNoteId", dn.number AS "deliveryNoteNumber",
           dn.sales_point AS "deliveryNoteSalesPoint", dn.issue_date AS "deliveryNoteIssueDate",
           dn.status AS "deliveryNoteStatus"
       FROM shipment_stops ss
       LEFT JOIN customers c ON c.id = ss.customer_id
       LEFT JOIN addresses a ON a.id = ss.address_id
       LEFT JOIN orders o ON o.id = ss.order_id
       LEFT JOIN delivery_notes dn ON dn.id = ss.delivery_note_id
       WHERE ss.shipment_id = ANY($1) AND ss.deleted_at IS NULL
       ORDER BY ss.shipment_id, ss.sequence ASC`,
      [shipmentIds],
    );

    for (const s of stopsRaw) {
      const arr = stopsByShipment[s.shipmentId] ?? (stopsByShipment[s.shipmentId] = []);
      arr.push({
        id: s.id,
        sequence: s.sequence,
        status: s.status,
        plannedWindow: s.plannedWindow,
        notes: s.notes,
        customer: s.customerId
          ? {
              id: s.customerId,
              legalName: s.legalName,
              commercialName: s.commercialName,
              taxId: s.taxId,
              phone: s.customerPhone,
            }
          : null,
        address: s.addressId
          ? {
              id: s.addressId,
              street: s.street,
              city: s.city,
              province: s.province,
              postalCode: s.postalCode,
              notes: s.addressNotes,
            }
          : null,
        order: s.orderId
          ? {
              id: s.orderId,
              number: s.orderNumber,
              status: s.orderStatus,
              total: s.orderTotal,
              notes: s.orderNotes,
              estimatedDeliveryDate: s.estimatedDeliveryDate,
            }
          : null,
        deliveryNote: s.deliveryNoteId
          ? {
              id: s.deliveryNoteId,
              number: s.deliveryNoteNumber,
              salesPoint: s.deliveryNoteSalesPoint,
              issueDate: s.deliveryNoteIssueDate,
              status: s.deliveryNoteStatus,
            }
          : null,
      });
    }
  }

  const shipments = shipmentsRaw.map((s) => ({
    ...s,
    stops: stopsByShipment[s.id] ?? [],
  }));

  let totalStops = 0;
  let documentedTotal = 0;
  let totalWeightKg = 0;
  const orderIds = new Set<string>();
  for (const sh of shipments) {
    totalWeightKg += Number(sh.totalWeightKg ?? 0);
    for (const st of sh.stops) {
      totalStops += 1;
      if (st.order) {
        orderIds.add(st.order.id);
        documentedTotal += Number(st.order.total ?? 0);
      }
    }
  }

  return {
    sheet: {
      id: row.id,
      number: row.number,
      date: row.date,
      status: row.status,
      notes: row.notes,
      vehicle: row.vehicleId
        ? {
            id: row.vehicleId,
            plate: row.vehiclePlate,
            model: row.vehicleModel,
            capacityKg: row.vehicleCapacityKg,
            capacityM3: row.vehicleCapacityM3,
          }
        : null,
      driver: row.driverId
        ? {
            id: row.driverId,
            fullName: row.driverFullName,
            dni: row.driverDni,
            phone: row.driverPhone,
            licenseNumber: row.driverLicenseNumber,
          }
        : null,
      warehouse: row.warehouseId
        ? {
            id: row.warehouseId,
            name: row.warehouseName,
            branchId: row.warehouseBranchId,
          }
        : null,
    },
    shipments,
    totals: {
      stops: totalStops,
      orders: orderIds.size,
      documentedTotal,
      totalWeightKg,
    },
  };
}
