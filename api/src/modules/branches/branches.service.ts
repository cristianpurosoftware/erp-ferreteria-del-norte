import { AppDataSource } from '../../config/data-source';
import { BranchEntity } from './data_access/branch.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { BranchEvents } from './branches.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(BranchEntity);

const BRANCH_COLUMNS: ColumnMap = {
  status: { type: 'enum',   column: 'status' },
  code:   { type: 'string', column: 'code' },
  name:   { type: 'string', column: 'name' },
};
const BRANCH_SORTABLE: SortableMap = ['name', 'code', 'status', 'createdAt'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('b');
  query.applyTo(qb, 'b', BRANCH_COLUMNS, BRANCH_SORTABLE, ['name', 'code'], {
    field: 'name', direction: 'ASC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOneBy({ id });
  if (!item) throw new NotFoundError('Sucursal no encontrada');
  return item;
}

export async function create(data: Partial<BranchEntity>) {
  const item = repo.create(data);
  const saved = await repo.save(item);
  eventBus.emit(BranchEvents.CREATED, saved);
  logger.info({ action: 'create', branchId: saved.id, name: saved.name, code: saved.code }, 'Branch created');
  return saved;
}

export async function update(id: string, data: Partial<BranchEntity>) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(BranchEvents.UPDATED, saved);
  logger.info({ action: 'update', branchId: id }, 'Branch updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  eventBus.emit(BranchEvents.DELETED, { id });
  logger.info({ action: 'delete', branchId: id }, 'Branch deleted');
}
