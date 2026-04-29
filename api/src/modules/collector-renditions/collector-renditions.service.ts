import { AppDataSource } from '../../config/data-source';
import { CollectorRenditionEntity } from './data_access/collector-rendition.entity';
import { CollectorRenditionLineEntity } from './data_access/collector-rendition-line.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { CollectorRenditionEvents } from './collector-renditions.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(CollectorRenditionEntity);
const lineRepo = AppDataSource.getRepository(CollectorRenditionLineEntity);

const TRANSITIONS: TransitionMap<string> = {
  draft: ['submitted'],
  submitted: ['approved', 'rejected'],
  approved: [],
  rejected: ['draft'],
};

const CR_COLUMNS: ColumnMap = {
  status:        { type: 'enum',   column: 'status' },
  collectorId:   { type: 'enum',   column: 'collectorId' },
  date:          { type: 'date',   column: 'date' },
  createdAt:     { type: 'date',   column: 'createdAt' },
  total:         { type: 'number', column: 'total' },
  collectorName: { type: 'string', sql: "TRIM(CONCAT(u.first_name, ' ', u.last_name))" },
};
const CR_SORTABLE: SortableMap = {
  date: 'r.date', status: 'r.status', total: 'r.total', createdAt: 'r.createdAt',
  collectorName: "TRIM(CONCAT(u.first_name, ' ', u.last_name))",
};
const CR_SEARCH = ['r.notes', "TRIM(CONCAT(u.first_name, ' ', u.last_name))", 'u.email'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('r')
    .leftJoin('users', 'u', 'u.id::text = r.collector_id::text')
    .addSelect("TRIM(CONCAT(u.first_name, ' ', u.last_name))", 'collectorName');

  query.applyTo(qb, 'r', CR_COLUMNS, CR_SORTABLE, CR_SEARCH, {
    field: 'date', direction: 'DESC',
  });
  // Stable tiebreaker: many rendiciones share the same date (day-level),
  // so without an id-based secondary sort, Postgres can return the same
  // row on consecutive pages and paginated lists look "stuck".
  qb.addOrderBy('r.id', 'ASC');

  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    collectorName: raw[i]?.collectorName?.trim() || null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function findSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('r')
    .leftJoin('users', 'u', 'u.id::text = r.collector_id::text')
    .select('COUNT(r.id)', 'total')
    .addSelect('COALESCE(SUM(r.total), 0)', 'totalAmount');
  query.applyFilters(qb, 'r', CR_COLUMNS, CR_SEARCH);
  const row = await qb.getRawOne();
  return {
    total: Number(row?.total ?? 0),
    totalAmount: Number(row?.totalAmount ?? 0),
  };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id }, relations: ['lines'] });
  if (!item) throw new NotFoundError('Rendición no encontrada');

  let collectorName: string | null = null;
  if (item.collectorId) {
    const rows: { name: string }[] = await AppDataSource.query(
      `SELECT TRIM(CONCAT(first_name, ' ', last_name)) AS name
         FROM users WHERE id::text = $1`,
      [item.collectorId],
    );
    collectorName = rows[0]?.name?.trim() || null;
  }

  return { ...item, collectorName };
}

export async function create(data: any) {
  const r = repo.create({
    collectorId: data.collectorId,
    shipmentId: data.shipmentId,
    date: data.date,
    notes: data.notes,
    status: 'draft',
  });
  if (data.lines?.length) {
    r.lines = data.lines.map((l: any) => lineRepo.create({
      paymentId: l.paymentId,
      declaredAmount: l.declaredAmount,
    }));
    const totalDeclared = data.lines.reduce((s: number, l: any) => s + Number(l.declaredAmount), 0);
    r.total = totalDeclared;
  }
  const saved = await repo.save(r);
  eventBus.emit(CollectorRenditionEvents.CREATED, saved);
  logger.info({ action: 'create', renditionId: saved.id, collectorId: saved.collectorId, total: saved.total }, 'Collector rendition created');
  return saved;
}

async function transitionTo(id: string, newStatus: string, event: string, patch: Partial<CollectorRenditionEntity> = {}) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'collector_rendition');
  item.status = newStatus;
  Object.assign(item, patch);
  const saved = await repo.save(item);
  eventBus.emit(event, saved);
  logger.info({ action: 'transition', renditionId: id, from, to: newStatus }, 'Collector rendition status updated');
  return saved;
}

export async function submit(id: string) { return transitionTo(id, 'submitted', CollectorRenditionEvents.SUBMITTED); }

export async function approve(id: string, userId?: string, lineUpdates?: Array<{ id: string; acceptedAmount?: number; reason?: string }>) {
  const item = await findById(id);
  if (lineUpdates) {
    const linesById = new Map(item.lines.map((l) => [l.id, l]));
    for (const upd of lineUpdates) {
      const line = linesById.get(upd.id);
      if (!line) continue;
      if (upd.acceptedAmount !== undefined) {
        line.acceptedAmount = upd.acceptedAmount;
        line.difference = Number(upd.acceptedAmount) - Number(line.declaredAmount);
      }
      if (upd.reason) line.reason = upd.reason;
      await lineRepo.save(line);
    }
  }
  return transitionTo(id, 'approved', CollectorRenditionEvents.APPROVED, { approvedBy: userId, approvedAt: new Date() });
}

export async function reject(id: string) { return transitionTo(id, 'rejected', CollectorRenditionEvents.REJECTED); }
