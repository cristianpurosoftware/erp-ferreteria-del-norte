import { AppDataSource } from '../../config/data-source';
import { SupplierEntity } from './data_access/supplier.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { SupplierEvents } from './suppliers.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(SupplierEntity);

const SUPPLIER_COLUMNS: ColumnMap = {
  name:        { type: 'string', column: 'name' },
  taxId:       { type: 'string', column: 'taxId' },
  email:       { type: 'string', column: 'email' },
  phone:       { type: 'string', column: 'phone' },
  status:      { type: 'enum',   column: 'status' },
  paymentCondition: { type: 'string', column: 'paymentCondition' },
  createdAt:   { type: 'date',   column: 'createdAt' },
};
const SUPPLIER_SORTABLE: SortableMap = ['name', 'taxId', 'status', 'createdAt'];
const SUPPLIER_SEARCH = ['name', 'tax_id', 'email', 'phone', 'primary_contact'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('s');
  query.applyTo(qb, 's', SUPPLIER_COLUMNS, SUPPLIER_SORTABLE, SUPPLIER_SEARCH, {
    field: 'name', direction: 'ASC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('s')
    .select('COUNT(s.id)', 'total')
    .addSelect('COUNT(CASE WHEN s.status = \'active\' THEN 1 END)', 'active');
  query.applyFilters(qb, 's', SUPPLIER_COLUMNS, SUPPLIER_SEARCH);
  const row = await qb.getRawOne();
  return {
    total: Number(row?.total ?? 0),
    active: Number(row?.active ?? 0),
  };
}

export async function findById(id: string) {
  const item = await repo.findOne({ where: { id } });
  if (!item) throw new NotFoundError('Proveedor no encontrado');
  return item;
}

export async function create(data: Partial<SupplierEntity>) {
  const item = repo.create(data);
  const saved = await repo.save(item);
  eventBus.emit(SupplierEvents.CREATED, saved);
  logger.info({ action: 'create', supplierId: saved.id, name: saved.name, taxId: saved.taxId }, 'Supplier created');
  return saved;
}

export async function update(id: string, data: Partial<SupplierEntity>) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(SupplierEvents.UPDATED, saved);
  logger.info({ action: 'update', supplierId: id }, 'Supplier updated');
  return saved;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  logger.info({ action: 'delete', supplierId: id }, 'Supplier deleted');
}
