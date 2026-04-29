import { AppDataSource } from '../../config/data-source';
import { WithholdingEntity } from './data_access/withholding.entity';
import { WithholdingPadronEntity } from './data_access/withholding-padron.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { WithholdingEvents } from './withholdings.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(WithholdingEntity);
const padronRepo = AppDataSource.getRepository(WithholdingPadronEntity);

const WH_COLUMNS: ColumnMap = {
  kind:           { type: 'enum',   column: 'kind' },
  direction:      { type: 'enum',   column: 'direction' },
  customerId:     { type: 'enum',   column: 'customerId' },
  supplierId:     { type: 'enum',   column: 'supplierId' },
  jurisdictionId: { type: 'enum',   column: 'jurisdictionId' },
  amount:         { type: 'number', column: 'amount' },
  createdAt:      { type: 'date',   column: 'createdAt' },
  customerName:   { type: 'string', sql: 'cu.legal_name' },
  supplierName:   { type: 'string', sql: 'su.name' },
};
const WH_SORTABLE: SortableMap = {
  createdAt: 'w.createdAt', amount: 'w.amount', kind: 'w.kind',
  direction: 'w.direction', customerName: 'cu.legal_name', supplierName: 'su.name',
};
const WH_SEARCH = ['w.certificate_number', 'cu.legal_name', 'su.name'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('w')
    .leftJoin('customers', 'cu', 'cu.id::text = w.customer_id::text')
    .leftJoin('suppliers', 'su', 'su.id::text = w.supplier_id::text')
    .addSelect('cu.legal_name', 'customerName')
    .addSelect('su.name', 'supplierName');
  query.applyTo(qb, 'w', WH_COLUMNS, WH_SORTABLE, WH_SEARCH, {
    field: 'createdAt', direction: 'DESC',
  });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    customerName: raw[i]?.customerName ?? null,
    supplierName: raw[i]?.supplierName ?? null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Retención no encontrada');
  return item;
}

export async function create(data: any) {
  const entity = repo.create(data as WithholdingEntity);
  const saved = await repo.save(entity);
  eventBus.emit(data.direction === 'applied' ? WithholdingEvents.APPLIED : WithholdingEvents.SUFFERED, saved);
  logger.info({ action: 'create', withholdingId: saved.id, kind: saved.kind, direction: saved.direction, amount: saved.amount }, 'Withholding created');
  return saved;
}

export async function update(id: string, data: any) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  logger.info({ action: 'update', withholdingId: id }, 'Withholding updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  logger.info({ action: 'delete', withholdingId: id }, 'Withholding deleted');
  return { id };
}

// Padron operations

export async function importPadrones(data: any) {
  const inserted = [];
  for (const row of data.rows) {
    const existing = await padronRepo.findOne({
      where: { kind: data.kind, jurisdictionId: data.jurisdictionId, cuit: row.cuit, validFrom: row.validFrom },
    });
    if (existing) continue;
    const p = padronRepo.create({
      kind: data.kind,
      jurisdictionId: data.jurisdictionId,
      cuit: row.cuit,
      ratePerception: row.ratePerception,
      rateWithholding: row.rateWithholding,
      validFrom: row.validFrom,
      validTo: row.validTo,
      source: data.source,
    });
    inserted.push(await padronRepo.save(p));
  }
  eventBus.emit(WithholdingEvents.PADRON_IMPORTED, { kind: data.kind, count: inserted.length });
  logger.info({ action: 'create', kind: data.kind, jurisdictionId: data.jurisdictionId, imported: inserted.length }, 'Withholding padron imported');
  return { imported: inserted.length };
}

export async function lookupPadron(cuit: string, kind: string, jurisdictionId?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const qb = padronRepo.createQueryBuilder('p')
    .where('p.cuit = :c', { c: cuit })
    .andWhere('p.kind = :k', { k: kind })
    .andWhere('p.valid_from <= :t', { t: today })
    .andWhere('(p.valid_to IS NULL OR p.valid_to >= :t)', { t: today });
  if (jurisdictionId) qb.andWhere('p.jurisdiction_id = :j', { j: jurisdictionId });
  qb.orderBy('p.valid_from', 'DESC');
  return qb.getOne();
}
