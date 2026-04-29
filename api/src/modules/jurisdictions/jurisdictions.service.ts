import { AppDataSource } from '../../config/data-source';
import { JurisdictionEntity } from './data_access/jurisdiction.entity';
import { CustomerJurisdictionEntity } from './data_access/customer-jurisdiction.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { JurisdictionEvents } from './jurisdictions.events';

const repo = AppDataSource.getRepository(JurisdictionEntity);
const cjRepo = AppDataSource.getRepository(CustomerJurisdictionEntity);

const JUR_COLUMNS: ColumnMap = {
  kind: { type: 'enum',   column: 'kind' },
  code: { type: 'string', column: 'code' },
  name: { type: 'string', column: 'name' },
};
const JUR_SORTABLE: SortableMap = ['code', 'name', 'kind'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('j');
  query.applyTo(qb, 'j', JUR_COLUMNS, JUR_SORTABLE, ['code', 'name'], {
    field: 'code', direction: 'ASC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Jurisdicción no encontrada');
  return item;
}

export async function create(data: any) {
  const existing = await repo.findOne({ where: { code: data.code } });
  if (existing) throw new BusinessLogicError('DUPLICATE_CODE', 'Ya existe una jurisdicción con ese código');
  const saved = await repo.save(repo.create(data));
  eventBus.emit(JurisdictionEvents.CREATED, saved);
  return saved;
}

export async function update(id: string, data: any) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(JurisdictionEvents.UPDATED, saved);
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  return { id };
}

// Customer jurisdictions

export async function findByCustomer(customerId: string) {
  return cjRepo.find({ where: { customerId } });
}

export async function addCustomerJurisdiction(customerId: string, data: any) {
  const saved = await cjRepo.save(cjRepo.create({ ...data, customerId }));
  eventBus.emit(JurisdictionEvents.CUSTOMER_LINKED, saved);
  return saved;
}

export async function removeCustomerJurisdiction(customerId: string, id: string) {
  const item = await cjRepo.findOne({ where: { id, customerId } });
  if (!item) throw new NotFoundError('Jurisdicción del cliente no encontrada');
  await cjRepo.softRemove(item);
  return { id };
}
