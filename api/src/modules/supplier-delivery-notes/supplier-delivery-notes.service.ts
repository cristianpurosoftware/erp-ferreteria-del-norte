import { AppDataSource } from '../../config/data-source';
import { SupplierDeliveryNoteEntity } from './data_access/supplier-delivery-note.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { SupplierDeliveryNoteEvents } from './supplier-delivery-notes.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(SupplierDeliveryNoteEntity);

const TRANSITIONS: TransitionMap<string> = {
  draft: ['received', 'discrepancy', 'closed'],
  received: ['closed', 'discrepancy'],
  discrepancy: ['closed'],
  closed: [],
};

const SDN_COLUMNS: ColumnMap = {
  status:       { type: 'enum',   column: 'status' },
  supplierId:   { type: 'enum',   column: 'supplierId' },
  warehouseId:  { type: 'enum',   column: 'warehouseId' },
  createdAt:    { type: 'date',   column: 'createdAt' },
  supplierName: { type: 'string', sql: 's.name' },
  warehouseName:{ type: 'string', sql: 'w.name' },
};
const SDN_SORTABLE: SortableMap = {
  createdAt: 'd.createdAt', status: 'd.status',
  supplierName: 's.name', warehouseName: 'w.name',
};
const SDN_SEARCH = ['d.supplier_delivery_note_number', 's.name', 'w.name'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('d')
    .leftJoin('suppliers', 's', 's.id::text = d.supplier_id::text')
    .leftJoin('warehouses', 'w', 'w.id::text = d.warehouse_id::text')
    .addSelect('s.name', 'supplierName')
    .addSelect('w.name', 'warehouseName');
  query.applyTo(qb, 'd', SDN_COLUMNS, SDN_SORTABLE, SDN_SEARCH, {
    field: 'createdAt', direction: 'DESC',
  });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    supplierName: raw[i]?.supplierName ?? null,
    warehouseName: raw[i]?.warehouseName ?? null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Remito de proveedor no encontrado');
  return item;
}

export async function create(data: any) {
  const item = repo.create({ ...data, status: 'draft' }) as unknown as SupplierDeliveryNoteEntity;
  const saved = await repo.save(item);
  eventBus.emit(SupplierDeliveryNoteEvents.CREATED, saved);
  logger.info({ action: 'create', supplierDeliveryNoteId: saved.id, supplierId: saved.supplierId, warehouseId: saved.warehouseId }, 'Supplier delivery note created');
  return saved;
}

export async function update(id: string, data: any) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  logger.info({ action: 'update', supplierDeliveryNoteId: id }, 'Supplier delivery note updated');
  return saved;
}

async function transitionTo(id: string, newStatus: string, event: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'supplier_delivery_note');
  item.status = newStatus;
  const saved = await repo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', supplierDeliveryNoteId: id, from, to: newStatus }, 'Supplier delivery note status updated');
  return saved;
}

export async function receive(id: string) { return transitionTo(id, 'received', SupplierDeliveryNoteEvents.RECEIVED); }
export async function close(id: string) { return transitionTo(id, 'closed', SupplierDeliveryNoteEvents.CLOSED); }
