import { AppDataSource } from '../../config/data-source';
import { UnitEntity } from './data_access/unit.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { UnitEvents } from './units.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(UnitEntity);

const UNIT_COLUMNS: ColumnMap = {
  type: { type: 'enum', column: 'type' },
  name: { type: 'string', column: 'name' },
  abbreviation: { type: 'string', column: 'abbreviation' },
};
const UNIT_SORTABLE: SortableMap = ['name', 'abbreviation', 'type', 'createdAt'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('u');
  query.applyTo(qb, 'u', UNIT_COLUMNS, UNIT_SORTABLE, ['name', 'abbreviation'], {
    field: 'name', direction: 'ASC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOneBy({ id });
  if (!item) throw new NotFoundError('Unidad no encontrada');
  return item;
}

export async function create(data: Partial<UnitEntity>) {
  const item = repo.create(data);
  const saved = await repo.save(item);
  eventBus.emit(UnitEvents.CREATED, saved);
  logger.info({ action: 'create', unitId: saved.id, name: saved.name, abbreviation: saved.abbreviation }, 'Unit created');
  return saved;
}

export async function update(id: string, data: Partial<UnitEntity>) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(UnitEvents.UPDATED, saved);
  logger.info({ action: 'update', unitId: id }, 'Unit updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  eventBus.emit(UnitEvents.DELETED, { id });
  logger.info({ action: 'delete', unitId: id }, 'Unit deleted');
}
