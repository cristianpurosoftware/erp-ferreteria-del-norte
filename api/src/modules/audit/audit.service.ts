import { AppDataSource } from '../../config/data-source';
import { AuditEventEntity } from './data_access/audit-event.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { resolveLabels } from './audit-label-registry';

const AUDIT_COLUMNS: ColumnMap = {
  actor_id:    { type: 'enum',   column: 'actor_id' },
  actorId:     { type: 'enum',   column: 'actor_id' },
  entity_type: { type: 'enum',   column: 'entity_type' },
  entityType:  { type: 'enum',   column: 'entity_type' },
  entity_id:   { type: 'enum',   column: 'entity_id' },
  entityId:    { type: 'enum',   column: 'entity_id' },
  action:      { type: 'enum',   column: 'action' },
  result:      { type: 'enum',   column: 'result' },
  actor_type:  { type: 'enum',   column: 'actor_type' },
  actorType:   { type: 'enum',   column: 'actor_type' },
  createdAt:   { type: 'date',   column: 'createdAt' },
  // Legacy audit API exposed `dateFrom`/`dateTo` — map to createdAt range.
  date:        { type: 'date',   column: 'createdAt' },
};
const AUDIT_SORTABLE: SortableMap = ['createdAt', 'entity_type', 'action', 'result'];
const AUDIT_SEARCH = [
  'e.entity_id',
  'e.entity_type',
  'e.action',
  "TRIM(CONCAT(u.first_name, ' ', u.last_name))",
  'u.email',
];

export class AuditService {
  private repo = AppDataSource.getRepository(AuditEventEntity);

  async log(data: {
    actorType: string;
    actorId?: string;
    action: string;
    entityType: string;
    entityId: string;
    previousState?: any;
    newState?: any;
    ipAddress?: string;
    result?: string;
    metadata?: Record<string, any>;
  }) {
    const event = this.repo.create({
      actor_type: data.actorType,
      actor_id: data.actorId,
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId,
      previous_state: data.previousState || null,
      new_state: data.newState || null,
      ip_address: data.ipAddress || null,
      result: data.result || 'success',
      metadata: data.metadata || null,
    });
    return this.repo.save(event);
  }

  async findAll(req: Record<string, unknown>) {
    const query = new ListQuery(req);
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoin('users', 'u', 'u.id::text = e.actor_id::text');
    query.applyTo(qb, 'e', AUDIT_COLUMNS, AUDIT_SORTABLE, AUDIT_SEARCH, {
      field: 'createdAt', direction: 'DESC',
    });

    const total = await qb.getCount();
    const items = await qb.getMany();
    const enriched = await this.resolveEntityLabels(items);
    return { items: enriched, meta: query.buildMeta(total) };
  }

  async findDistinctEntityTypes(): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('e')
      .select('DISTINCT e.entity_type', 'entity_type')
      .orderBy('e.entity_type', 'ASC')
      .getRawMany();
    return rows.map((r) => r.entity_type).filter(Boolean);
  }

  async findDistinctActions(): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('e')
      .select('DISTINCT e.action', 'action')
      .orderBy('e.action', 'ASC')
      .getRawMany();
    return rows.map((r) => r.action).filter(Boolean);
  }

  async findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  private async resolveEntityLabels(events: AuditEventEntity[]) {
    const groups: Record<string, Set<string>> = {};
    for (const e of events) {
      if (!e.entity_type || !e.entity_id) continue;
      if (!groups[e.entity_type]) groups[e.entity_type] = new Set();
      groups[e.entity_type].add(e.entity_id);
    }

    const labelMap = await resolveLabels(groups);

    return events.map((e) => ({
      ...e,
      entityLabel: labelMap[`${e.entity_type}:${e.entity_id}`] ?? null,
    }));
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.repo.find({
      where: { entity_type: entityType, entity_id: entityId },
      order: { createdAt: 'DESC' },
    });
  }
}

export const auditService = new AuditService();
