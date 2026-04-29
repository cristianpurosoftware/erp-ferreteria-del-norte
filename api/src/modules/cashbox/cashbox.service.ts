import { AppDataSource } from '../../config/data-source';
import { withTransaction } from '../../common/transaction';
import { CashboxEntity } from './data_access/cashbox.entity';
import { CashboxSessionEntity } from './data_access/cashbox-session.entity';
import { PaginationQuery, buildPaginationMeta } from '../../common/pagination';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError, ForbiddenError } from '../../common/errors';
import { env } from '../../config/env';
import eventBus from '../../common/event-bus';
import { CashboxEvents } from './cashbox.events';
import { logger } from '../../common/logger';

const cashboxRepo = AppDataSource.getRepository(CashboxEntity);
const sessionRepo = AppDataSource.getRepository(CashboxSessionEntity);

export interface SessionListQuery extends PaginationQuery {
  cashboxId?: string[];
  userId?: string[];
  status?: ('open' | 'closed')[];
  from?: string;
  to?: string;
}

// Whitelist of sortable columns — must use entity property paths, not raw SQL
// column names. `getManyAndCount` wraps the query with a pagination subquery
// that references the outer SELECT aliases, which TypeORM only generates for
// entity paths (e.g. `s.openedAt`), not for snake_case DB columns.
const SESSION_SORT_COLUMNS: Record<string, string> = {
  openedAt: 's.openedAt',
  closedAt: 's.closedAt',
  openingBalance: 's.openingBalance',
  closingBalance: 's.closingBalance',
  difference: 's.difference',
  cashbox: 'c.name',
};

const CB_COLUMNS: ColumnMap = {
  status:     { type: 'enum',   column: 'status' },
  branchId:   { type: 'enum',   column: 'branchId' },
  name:       { type: 'string', column: 'name' },
  branchName: { type: 'string', sql: 'b.name' },
};
const CB_SORTABLE: SortableMap = {
  name:       'cb.name',
  status:     'cb.status',
  createdAt:  'cb.createdAt',
  branchName: 'b.name',
};
const CB_SEARCH = ['cb.name'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = cashboxRepo.createQueryBuilder('cb')
    .leftJoin('branches', 'b', 'b.id::text = cb.branch_id')
    .addSelect('b.name', 'branchName');
  query.applyTo(qb, 'cb', CB_COLUMNS, CB_SORTABLE, CB_SEARCH, {
    field: 'name', direction: 'ASC',
  });
  const total = await qb.getCount();
  const { entities, raw } = await qb.getRawAndEntities();
  const items = entities.map((e, i) => ({
    ...e,
    branchName: raw[i]?.branchName ?? null,
  }));
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await cashboxRepo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Caja no encontrada');
  return item;
}

export async function findAllSessions(query: SessionListQuery) {
  const qb = sessionRepo.createQueryBuilder('s')
    .leftJoinAndSelect('s.cashbox', 'c');

  if (query.cashboxId?.length) {
    qb.andWhere('s.cashbox_id IN (:...cashboxIds)', { cashboxIds: query.cashboxId });
  }
  if (query.userId?.length) {
    qb.andWhere('(s.opened_by IN (:...userIds) OR s.closed_by IN (:...userIds))', {
      userIds: query.userId,
    });
  }
  if (query.status?.length) {
    const clauses: string[] = [];
    if (query.status.includes('open')) clauses.push('s.closed_at IS NULL');
    if (query.status.includes('closed')) clauses.push('s.closed_at IS NOT NULL');
    if (clauses.length) qb.andWhere(`(${clauses.join(' OR ')})`);
  }
  if (query.from) qb.andWhere('s.opened_at >= :from', { from: query.from });
  if (query.to) qb.andWhere('s.opened_at <= :to', { to: query.to });

  const sortCol = query.sortBy ? SESSION_SORT_COLUMNS[query.sortBy] : null;
  const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
  qb.orderBy(sortCol ?? 's.openedAt', sortOrder);
  qb.skip(query.skip).take(query.limit);

  const [items, total] = await qb.getManyAndCount();

  // Batch resolve user names (openedBy / closedBy)
  const userIds = new Set<string>();
  for (const s of items) {
    if (s.openedBy) userIds.add(s.openedBy);
    if (s.closedBy) userIds.add(s.closedBy);
  }

  const userMap = new Map<string, string>();
  if (userIds.size > 0) {
    try {
      const rows = await AppDataSource.query(
        `SELECT id::text AS id, CONCAT(first_name, ' ', last_name) AS name FROM users WHERE id::text = ANY($1)`,
        [Array.from(userIds)],
      );
      for (const r of rows) userMap.set(r.id, r.name);
    } catch {
      // Fall back to raw IDs
    }
  }

  const enriched = items.map((s) => ({
    ...s,
    cashboxName: s.cashbox?.name ?? null,
    openedByName: userMap.get(s.openedBy) ?? null,
    closedByName: s.closedBy ? (userMap.get(s.closedBy) ?? null) : null,
  }));

  return { items: enriched, meta: buildPaginationMeta(query, total) };
}

export async function create(data: { name: string; branchId: string }) {
  const cashbox = cashboxRepo.create({
    name: data.name,
    branchId: data.branchId,
    status: 'closed',
  });
  const saved = await cashboxRepo.save(cashbox);
  eventBus.emit(CashboxEvents.CREATED, saved);
  logger.info({ action: 'create', cashboxId: saved.id, name: saved.name, branchId: saved.branchId }, 'Cashbox created');
  return saved;
}

export async function update(id: string, data: Partial<{ name: string; branchId: string }>) {
  const cashbox = await findById(id);
  if (data.name !== undefined) cashbox.name = data.name;
  if (data.branchId !== undefined) cashbox.branchId = data.branchId;
  const saved = await cashboxRepo.save(cashbox);
  logger.info({ action: 'update', cashboxId: id }, 'Cashbox updated');
  return saved;
}

export async function remove(id: string) {
  const cashbox = await findById(id);
  if (cashbox.status !== 'closed') {
    throw new BusinessLogicError('CASHBOX_NOT_CLOSED', 'No se puede eliminar una caja abierta');
  }
  await cashboxRepo.softRemove(cashbox);
  logger.info({ action: 'delete', cashboxId: id }, 'Cashbox deleted');
}

export async function open(id: string, userId: string, openingBalance: number) {
  const result = await withTransaction(async (em) => {
    const cashboxTx = em.getRepository(CashboxEntity);
    const sessionTx = em.getRepository(CashboxSessionEntity);

    const cashbox = await cashboxTx
      .createQueryBuilder('c')
      .setLock('pessimistic_write')
      .where('c.id = :id', { id })
      .getOne();
    if (!cashbox) throw new NotFoundError('Caja no encontrada');
    if (cashbox.status !== 'closed') {
      throw new BusinessLogicError('CASHBOX_NOT_CLOSED', 'La caja debe estar cerrada para poder abrirla');
    }

    const session = sessionTx.create({
      cashboxId: cashbox.id,
      openedBy: userId,
      openedAt: new Date(),
      openingBalance,
    });
    await sessionTx.save(session);

    cashbox.status = 'open';
    const saved = await cashboxTx.save(cashbox);
    return { cashbox: saved, session };
  });

  eventBus.emit(CashboxEvents.OPENED, result);
  logger.info({ action: 'transition', cashboxId: id, from: 'closed', to: 'open', openingBalance }, 'Cashbox opened');
  return result;
}

export async function close(
  id: string,
  userId: string,
  closingBalance: number,
  notes: string | undefined,
  userPermissions: string[],
) {
  const tolerance = Number(env.CASHBOX_DIFF_TOLERANCE);

  const result = await withTransaction(async (em) => {
    const cashboxTx = em.getRepository(CashboxEntity);
    const sessionTx = em.getRepository(CashboxSessionEntity);

    const cashbox = await cashboxTx
      .createQueryBuilder('c')
      .setLock('pessimistic_write')
      .where('c.id = :id', { id })
      .getOne();
    if (!cashbox) throw new NotFoundError('Caja no encontrada');
    if (cashbox.status !== 'open') {
      throw new BusinessLogicError('CASHBOX_NOT_OPEN', 'La caja debe estar abierta para poder cerrarla');
    }

    const session = await sessionTx.findOne({
      where: { cashboxId: cashbox.id, closedAt: undefined as any },
      order: { openedAt: 'DESC' },
    });
    if (!session) throw new NotFoundError('Sesión activa no encontrada');

    const expectedBalance = Number(session.openingBalance);
    const difference = closingBalance - expectedBalance;
    const hasDiff = Math.abs(difference) > tolerance;

    if (hasDiff) {
      if (!userPermissions.includes('cashbox:close_with_diff')) {
        throw new ForbiddenError('Cerrar con diferencia requiere el permiso cashbox:close_with_diff');
      }
      if (!notes || notes.trim() === '') {
        throw new BusinessLogicError(
          'CASHBOX_DIFF_REQUIRES_NOTES',
          'Se requiere una nota al cerrar con diferencia',
        );
      }
    }

    session.closedBy = userId;
    session.closedAt = new Date();
    session.closingBalance = closingBalance;
    session.expectedBalance = expectedBalance;
    session.difference = difference;
    session.notes = (notes || null) as any;
    await sessionTx.save(session);

    cashbox.status = hasDiff ? 'closed_with_diff' : 'closed';
    const saved = await cashboxTx.save(cashbox);

    return { cashbox: saved, session, hasDiff };
  });

  const event = result.hasDiff ? CashboxEvents.CLOSED_WITH_DIFF : CashboxEvents.CLOSED;
  eventBus.emit(event, { cashbox: result.cashbox, session: result.session });
  const toStatus = result.hasDiff ? 'closed_with_diff' : 'closed';
  logger.info({ action: 'transition', cashboxId: id, from: 'open', to: toStatus, closingBalance }, 'Cashbox closed');
  return { cashbox: result.cashbox, session: result.session };
}
