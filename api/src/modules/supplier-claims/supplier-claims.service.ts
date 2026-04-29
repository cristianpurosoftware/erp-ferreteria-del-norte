import { AppDataSource } from '../../config/data-source';
import { SupplierClaimEntity } from './data_access/supplier-claim.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { SupplierClaimEvents } from './supplier-claims.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(SupplierClaimEntity);

const TRANSITIONS: TransitionMap<string> = {
  open: ['sent', 'rejected'],
  sent: ['acknowledged', 'rejected'],
  acknowledged: ['credit_received', 'resolved', 'rejected'],
  credit_received: ['resolved'],
  resolved: [],
  rejected: [],
};

const SC_COLUMNS: ColumnMap = {
  status:       { type: 'enum',   column: 'status' },
  kind:         { type: 'enum',   column: 'kind' },
  supplierId:   { type: 'enum',   column: 'supplierId' },
  createdAt:    { type: 'date',   column: 'createdAt' },
  supplierName: { type: 'string', sql: 's.name' },
};
const SC_SORTABLE: SortableMap = {
  createdAt: 'c.createdAt', status: 'c.status', supplierName: 's.name',
};
const SC_SEARCH = ['c.notes', 's.name'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('c')
    .leftJoin('suppliers', 's', 's.id::text = c.supplier_id::text')
    .addSelect('s.name', 'supplierName');
  query.applyTo(qb, 'c', SC_COLUMNS, SC_SORTABLE, SC_SEARCH, {
    field: 'createdAt', direction: 'DESC',
  });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({ ...e, supplierName: raw[i]?.supplierName ?? null }));
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Reclamo a proveedor no encontrado');
  return item;
}

export async function create(data: any, userId?: string) {
  const item = repo.create({ ...data, openedBy: userId, status: 'open' }) as unknown as SupplierClaimEntity;
  const saved = await repo.save(item);
  eventBus.emit(SupplierClaimEvents.OPENED, saved);
  logger.info({ action: 'create', supplierClaimId: saved.id, supplierId: saved.supplierId, kind: saved.kind }, 'Supplier claim created');
  return saved;
}

export async function update(id: string, data: any) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  logger.info({ action: 'update', supplierClaimId: id }, 'Supplier claim updated');
  return saved;
}

async function transitionTo(id: string, newStatus: string, event: string, patch: Partial<SupplierClaimEntity> = {}) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'supplier_claim');
  item.status = newStatus;
  Object.assign(item, patch);
  const saved = await repo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', supplierClaimId: id, from, to: newStatus }, 'Supplier claim status updated');
  return saved;
}

export async function send(id: string) { return transitionTo(id, 'sent', SupplierClaimEvents.SENT); }
export async function acknowledge(id: string) { return transitionTo(id, 'acknowledged', SupplierClaimEvents.ACKNOWLEDGED); }
export async function creditReceived(id: string) { return transitionTo(id, 'credit_received', SupplierClaimEvents.CREDIT_RECEIVED); }
export async function resolve(id: string) { return transitionTo(id, 'resolved', SupplierClaimEvents.RESOLVED, { resolvedAt: new Date() }); }
export async function reject(id: string) { return transitionTo(id, 'rejected', SupplierClaimEvents.REJECTED); }
