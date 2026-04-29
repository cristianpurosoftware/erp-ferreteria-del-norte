import { AppDataSource } from '../../config/data-source';
import { BankStatementEntity } from './data_access/bank-statement.entity';
import { BankStatementLineEntity } from './data_access/bank-statement-line.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { BankStatementEvents } from './bank-statements.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(BankStatementEntity);
const lineRepo = AppDataSource.getRepository(BankStatementLineEntity);

const BS_COLUMNS: ColumnMap = {
  status:        { type: 'enum',   column: 'status' },
  bankAccountId: { type: 'enum',   column: 'bankAccountId' },
  source:        { type: 'enum',   column: 'source' },
  periodStart:   { type: 'date',   column: 'periodStart' },
  periodEnd:     { type: 'date',   column: 'periodEnd' },
  createdAt:     { type: 'date',   column: 'createdAt' },
};
const BS_SORTABLE: SortableMap = ['periodEnd', 'periodStart', 'status', 'createdAt'];
const BS_SEARCH = ['source'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('s');
  query.applyTo(qb, 's', BS_COLUMNS, BS_SORTABLE, BS_SEARCH, {
    field: 'periodEnd', direction: 'DESC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id }, relations: ['lines'] });
  if (!item) throw new NotFoundError('Extracto bancario no encontrado');
  return item;
}

export async function create(data: any) {
  const stmt = repo.create({
    bankAccountId: data.bankAccountId,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    openingBalance: data.openingBalance,
    closingBalance: data.closingBalance,
    source: data.source ?? 'manual',
    status: 'imported',
  });
  if (data.lines?.length) {
    stmt.lines = data.lines.map((l: any) => lineRepo.create(l));
  }
  const saved = await repo.save(stmt);
  eventBus.emit(BankStatementEvents.IMPORTED, saved);
  logger.info({ action: 'create', bankStatementId: saved.id, bankAccountId: saved.bankAccountId, periodStart: saved.periodStart, periodEnd: saved.periodEnd, source: saved.source }, 'Bank statement created');
  return saved;
}

export async function markReconciled(id: string) {
  const item = await findById(id);
  const from = item.status;
  item.status = 'reconciled';
  const saved = await repo.save(item);
  eventBus.emit(BankStatementEvents.RECONCILED, saved);
  logger.info({ action: 'transition', bankStatementId: id, from, to: 'reconciled' }, 'Bank statement status updated');
  return saved;
}
