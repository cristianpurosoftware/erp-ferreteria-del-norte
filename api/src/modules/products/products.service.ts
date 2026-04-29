import { AppDataSource } from '../../config/data-source';
import { ProductEntity } from './data_access/product.entity';
import { ProductVariantEntity } from './data_access/product-variant.entity';
import { ListQuery, type ColumnMap } from '../../common/list-query';
import { NotFoundError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import eventBus from '../../common/event-bus';
import { ProductEvents } from './products.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(ProductEntity);
const variantRepo = AppDataSource.getRepository(ProductVariantEntity);

const TRANSITIONS: TransitionMap<string> = {
  draft: ['active'],
  active: ['inactive', 'discontinued'],
  inactive: ['active', 'discontinued'],
  discontinued: ['archived'],
  archived: [],
};

const PRODUCT_COLUMNS: ColumnMap = {
  sku: { type: 'string', column: 'sku' },
  name: { type: 'string', column: 'name' },
  description: { type: 'string', column: 'description' },
  status: { type: 'enum', column: 'status' },
  productType: { type: 'enum', column: 'productType' },
  categoryId: { type: 'enum', column: 'categoryId' },
  brandId: { type: 'enum', column: 'brandId' },
  unitId: { type: 'enum', column: 'unitId' },
  preferredSupplierId: { type: 'enum', column: 'preferredSupplierId' },
  basePrice: { type: 'number', column: 'basePrice' },
  baseCost: { type: 'number', column: 'baseCost' },
  controlsStock: { type: 'boolean', column: 'controlsStock' },
};

const PRODUCT_SORTABLE = [
  'sku', 'name', 'status', 'productType', 'basePrice', 'baseCost',
  'createdAt', 'updatedAt', 'minStock', 'reorderPoint',
];

const PRODUCT_SEARCH_COLUMNS = ['name', 'sku', 'description'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = repo.createQueryBuilder('p');
  query.applyTo(
    qb,
    'p',
    PRODUCT_COLUMNS,
    PRODUCT_SORTABLE,
    PRODUCT_SEARCH_COLUMNS,
    { field: 'createdAt', direction: 'DESC' },
  );
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const qb = repo.createQueryBuilder('p')
    .leftJoinAndSelect('p.variants', 'v')
    .leftJoin('categories', 'cat', 'cat.id::text = p.category_id')
    .leftJoin('brands', 'b', 'b.id::text = p.brand_id')
    .leftJoin('units_of_measure', 'u', 'u.id::text = p.unit_id')
    .addSelect('cat.name', 'categoryName')
    .addSelect('b.name', 'brandName')
    .addSelect('u.name', 'unitName')
    .addSelect('u.abbreviation', 'unitAbbreviation')
    .where('p.id = :id', { id });

  const result = await qb.getRawAndEntities();
  const entity = result.entities[0];
  if (!entity) throw new NotFoundError('Producto no encontrado');

  return {
    ...entity,
    categoryName: result.raw[0]?.categoryName ?? null,
    brandName: result.raw[0]?.brandName ?? null,
    unitName: result.raw[0]?.unitName ?? null,
    unitAbbreviation: result.raw[0]?.unitAbbreviation ?? null,
  };
}

export async function findPricesByProduct(productId: string) {
  const items = await AppDataSource.query(
    `SELECT pli.price, pli.min_quantity AS "minQuantity",
            pl.name AS "priceListName", pl.currency, pl.status
     FROM price_list_items pli
     JOIN price_lists pl ON pl.id = pli.price_list_id
     WHERE pli.product_id = $1 AND pl.deleted_at IS NULL AND pli.deleted_at IS NULL
     ORDER BY pl.name`,
    [productId]
  );
  return items;
}

export async function findOrdersByProduct(productId: string, limit = 10) {
  const rows = await AppDataSource.query(
    `SELECT o.id, o.number, o.status, o.created_at AS "createdAt", o.total,
            oi.quantity, oi.unit_price AS "unitPrice", oi.subtotal,
            COALESCE(c.commercial_name, c.legal_name) AS "customerName"
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     LEFT JOIN customers c ON c.id::text = o.customer_id
     WHERE oi.product_id = $1 AND o.deleted_at IS NULL AND oi.deleted_at IS NULL
     ORDER BY o.created_at DESC
     LIMIT $2`,
    [productId, limit]
  );
  return rows;
}

export async function create(data: any) {
  const { variants, ...productData } = data;
  const product = repo.create(productData);
  const saved: ProductEntity = await repo.save(product as any);

  if (variants && variants.length > 0) {
    const variantEntities = variants.map((v: any) =>
      variantRepo.create({ ...v, productId: saved.id }),
    );
    saved.variants = await variantRepo.save(variantEntities) as any;
  }

  eventBus.emit(ProductEvents.CREATED, saved);
  logger.info({ action: 'create', productId: saved.id, sku: saved.sku, status: saved.status }, 'Product created');
  return saved;
}

export async function update(id: string, data: Partial<ProductEntity>) {
  const item = await findById(id);
  Object.assign(item, data);
  const saved = await repo.save(item);
  eventBus.emit(ProductEvents.UPDATED, saved);
  logger.info({ action: 'update', productId: id }, 'Product updated');
  return saved;
}

export async function changeStatus(id: string, newStatus: string) {
  const item = await findById(id);
  const from = item.status;
  assertTransition(TRANSITIONS, from, newStatus, 'product');
  item.status = newStatus;
  const saved = await repo.save(item);

  const eventMap: Record<string, string> = {
    active: ProductEvents.ACTIVATED,
    discontinued: ProductEvents.DISCONTINUED,
  };
  const event = eventMap[newStatus];
  if (event) eventBus.emit(event, saved);

  logger.info({ action: 'transition', productId: id, from, to: newStatus }, 'Product status updated');
  return saved;
}

export async function findBySku(sku: string) {
  const item = await repo.findOne({ where: { sku } });
  if (!item) throw new NotFoundError('Producto no encontrado');
  return item;
}

export async function remove(id: string) {
  const item = await findById(id);
  await repo.softRemove(item);
  eventBus.emit(ProductEvents.DELETED, { id });
  logger.info({ action: 'delete', productId: id }, 'Product deleted');
}
