import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../config/data-source';
import { ProductEntity } from '../modules/products/data_access/product.entity';
import { BrandEntity } from '../modules/brands/data_access/brand.entity';
import { CategoryEntity } from '../modules/categories/data_access/category.entity';
import { SupplierEntity } from '../modules/suppliers/data_access/supplier.entity';
import { StockEntity } from '../modules/inventory/data_access/stock.entity';
import { WarehouseEntity } from '../modules/warehouses/data_access/warehouse.entity';
import { PriceListEntity } from '../modules/price-lists/data_access/price-list.entity';
import { PriceListItemEntity } from '../modules/price-lists/data_access/price-list-item.entity';
import { UnitEntity } from '../modules/units/data_access/unit.entity';

// Source `UnidadMedida` string → canonical ERP unit.
// Matched on abbreviation, so rows already seeded by master-data
// (Unidad/un, Kilogramo/kg, Litro/lt) are reused.
const UNIT_MAP: Record<string, { name: string; abbreviation: string; type: string }> = {
  'g.':    { name: 'Gramos',              abbreviation: 'gr', type: 'weight' },
  'u.':    { name: 'Unidad',              abbreviation: 'un', type: 'count'  },
  'ml.':   { name: 'Mililitros',          abbreviation: 'ml', type: 'volume' },
  'Lt.':   { name: 'Litros',              abbreviation: 'lt', type: 'volume' },
  'Kg.':   { name: 'Kilogramos',          abbreviation: 'kg', type: 'weight' },
  'MAZOS': { name: 'Mazo',                abbreviation: 'mz', type: 'count'  },
  'cc.':   { name: 'Centímetros cúbicos', abbreviation: 'cc', type: 'volume' },
};

const IN_PROJECT_CATALOG = path.join(__dirname, 'demo', 'catalogopro', 'catalog-mapped.json');
const CATALOG_PATH = process.env.CATALOGOPRO_CATALOG_JSON
  || (fs.existsSync(IN_PROJECT_CATALOG) ? IN_PROJECT_CATALOG : '/tmp/catalogopro/catalog-mapped.json');
const TOP_N = parseInt(process.env.CATALOGOPRO_TOP_N || '500', 10);
const RESET = process.env.CATALOGOPRO_RESET_PRODUCTS === 'true';
const PRICE_LIST_NAME = 'Lista General';

// Soft-delete every existing product and its dependent rows (stock,
// price_list_items). History tables keep their FKs to the old UUIDs and can
// be read with `withDeleted: true`. We also rename the soft-deleted SKUs so
// their UNIQUE index does not block re-seeding with the same source IDs.
async function softDeleteExistingProducts(): Promise<number> {
  const stamp = Date.now();
  const productRepo = AppDataSource.getRepository(ProductEntity);
  await productRepo
    .createQueryBuilder()
    .update()
    .set({ sku: () => `'DEL-${stamp}-' || sku` })
    .where('sku IS NOT NULL AND sku NOT LIKE \'DEL-%\'')
    .execute();
  const productsResult = await productRepo
    .createQueryBuilder().softDelete().execute();
  await AppDataSource.getRepository(StockEntity)
    .createQueryBuilder().softDelete().execute();
  await AppDataSource.getRepository(PriceListItemEntity)
    .createQueryBuilder().softDelete().execute();
  return productsResult.affected ?? 0;
}

interface RawCategory {
  id: number;
  name: string;
  parentId: number | null;
  level: number;
  breadcrumbs: string | null;
}

interface RawProduct {
  externalId: number;
  sku: string;
  barcode: string | null;
  name: string;
  shortName: string;
  description: string | null;
  unit: string | null;
  taxRate: number;
  brandId: number | null;
  brandName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryBreadcrumbs: string | null;
  supplierId: number | null;
  basePrice: number | null;
  netPrice: number | null;
  stock: number | null;
  status: string;
  hasPrice: boolean;
}

interface Catalog {
  brands: { id: number; name: string }[];
  categoriesFlat: RawCategory[];
  products: RawProduct[];
}

// Deterministic hash-to-index so the same source supplier always maps to the
// same fictitious supplier across reruns.
function hashToIndex(n: number, buckets: number): number {
  return ((n * 2654435761) >>> 0) % buckets;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function seedCatalogoproDemo() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.warn(`[catalogopro-demo] Catalog not found at ${CATALOG_PATH}. Skipping.`);
    return;
  }

  const catalog: Catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

  const productRepo = AppDataSource.getRepository(ProductEntity);

  if (RESET) {
    const before = await productRepo.count();
    const deleted = await softDeleteExistingProducts();
    console.log(`[catalogopro-demo] Reset requested: soft-deleted ${deleted} products (${before} were live).`);
  }

  const existingCount = await productRepo.count();
  if (existingCount > 10) {
    console.log(`[catalogopro-demo] ${existingCount} products already exist, skipping. Use CATALOGOPRO_RESET_PRODUCTS=true to wipe.`);
    return;
  }

  const brandRepo = AppDataSource.getRepository(BrandEntity);
  const categoryRepo = AppDataSource.getRepository(CategoryEntity);
  const supplierRepo = AppDataSource.getRepository(SupplierEntity);
  const stockRepo = AppDataSource.getRepository(StockEntity);
  const warehouseRepo = AppDataSource.getRepository(WarehouseEntity);
  const priceListRepo = AppDataSource.getRepository(PriceListEntity);
  const priceListItemRepo = AppDataSource.getRepository(PriceListItemEntity);
  const unitRepo = AppDataSource.getRepository(UnitEntity);

  // ─── Pre-requisites ─────────────────────────────────────
  const warehouses = await warehouseRepo.find({ where: { status: 'active' } });
  if (warehouses.length === 0) {
    throw new Error('[catalogopro-demo] No active warehouses found. Run company seed first.');
  }
  console.log(`[catalogopro-demo] Found ${warehouses.length} warehouses to distribute stock across.`);

  // ─── 1. Fictitious suppliers ────────────────────────────
  const supplierSeeds = [
    { name: 'Distribuidora Norte S.A.', taxId: '30-71234567-8', primaryContact: 'Juan Pérez', phone: '+54 11 4555-0100', email: 'ventas@distnorte.com.ar', paymentCondition: '30 dias' },
    { name: 'Mayorista del Sur SRL', taxId: '30-71234567-9', primaryContact: 'María González', phone: '+54 11 4555-0200', email: 'pedidos@maysur.com.ar', paymentCondition: '60 dias' },
    { name: 'Importadora Central', taxId: '30-71234568-0', primaryContact: 'Carlos Rodríguez', phone: '+54 11 4555-0300', email: 'info@impcentral.com.ar', paymentCondition: 'Contado' },
    { name: 'Proveedor Integral SA', taxId: '30-71234568-1', primaryContact: 'Lucía Martínez', phone: '+54 11 4555-0400', email: 'contacto@provintegral.com.ar', paymentCondition: '30 dias' },
    { name: 'Distribuidora Patagonia', taxId: '30-71234568-2', primaryContact: 'Roberto Silva', phone: '+54 11 4555-0500', email: 'ventas@distpatagonia.com.ar', paymentCondition: '30 dias' },
    { name: 'Mayorista Andino', taxId: '30-71234568-3', primaryContact: 'Patricia López', phone: '+54 11 4555-0600', email: 'pedidos@mayandino.com.ar', paymentCondition: '60 dias' },
    { name: 'Proveedor Litoral', taxId: '30-71234568-4', primaryContact: 'Diego Fernández', phone: '+54 11 4555-0700', email: 'info@provlitoral.com.ar', paymentCondition: 'Contado' },
    { name: 'Distribuidora Cuyana', taxId: '30-71234568-5', primaryContact: 'Verónica Torres', phone: '+54 11 4555-0800', email: 'contacto@distcuyana.com.ar', paymentCondition: '30 dias' },
  ];
  const suppliers: SupplierEntity[] = [];
  for (const s of supplierSeeds) {
    let existing = await supplierRepo.findOneBy({ taxId: s.taxId });
    if (!existing) existing = await supplierRepo.save(supplierRepo.create({ ...s, status: 'active' }));
    suppliers.push(existing);
  }
  console.log(`[catalogopro-demo] Suppliers ready: ${suppliers.length}`);

  // ─── 1b. Units (upsert by abbreviation) ─────────────────
  const unitAbbrevToId = new Map<string, string>();
  for (const target of Object.values(UNIT_MAP)) {
    if (unitAbbrevToId.has(target.abbreviation)) continue;
    let existing = await unitRepo.findOneBy({ abbreviation: target.abbreviation });
    if (!existing) existing = await unitRepo.save(unitRepo.create(target));
    unitAbbrevToId.set(target.abbreviation, existing.id);
  }
  console.log(`[catalogopro-demo] Units ready: ${unitAbbrevToId.size}`);

  // ─── 2. Pick top N products ─────────────────────────────
  const eligible = catalog.products.filter(
    (p) => p.status === 'active' && p.hasPrice && (p.stock ?? 0) > 0
      && (p.basePrice ?? 0) > 0 && p.name.length > 0,
  );
  eligible.sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0));
  const selected = eligible.slice(0, TOP_N);
  console.log(`[catalogopro-demo] Selected ${selected.length} / ${eligible.length} eligible products.`);

  // ─── 3. Brands used by selected ─────────────────────────
  const usedBrandIds = new Set(selected.map((p) => p.brandId).filter((id): id is number => id !== null));
  const brandMap = new Map<number, string>();
  for (const b of catalog.brands) brandMap.set(b.id, b.name);

  const brandIdToEntity = new Map<number, BrandEntity>();
  for (const brandId of usedBrandIds) {
    const name = brandMap.get(brandId);
    if (!name) continue;
    let existing = await brandRepo.findOneBy({ name });
    if (!existing) existing = await brandRepo.save(brandRepo.create({ name, status: 'active' }));
    brandIdToEntity.set(brandId, existing);
  }
  console.log(`[catalogopro-demo] Brands upserted: ${brandIdToEntity.size}`);

  // ─── 4. Categories (ancestors included) ─────────────────
  const catsById = new Map<number, RawCategory>();
  for (const c of catalog.categoriesFlat) catsById.set(c.id, c);

  const neededCatIds = new Set<number>();
  for (const p of selected) {
    if (p.categoryId == null) continue;
    let cur: RawCategory | undefined = catsById.get(p.categoryId);
    while (cur) {
      if (neededCatIds.has(cur.id)) break;
      neededCatIds.add(cur.id);
      cur = cur.parentId != null ? catsById.get(cur.parentId) : undefined;
    }
  }

  // Process in ascending `level` order so parents exist before children.
  const neededSorted = Array.from(neededCatIds)
    .map((id) => catsById.get(id)!)
    .filter(Boolean)
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0));

  const rawCatIdToDbId = new Map<number, string>();
  for (const rawCat of neededSorted) {
    const parentId = rawCat.parentId != null ? rawCatIdToDbId.get(rawCat.parentId) ?? null : null;
    // Name collisions are possible across branches (e.g. "Pilas -> Pilas") so
    // we scope the lookup by parent.
    let existing = await categoryRepo.findOne({ where: { name: rawCat.name, parentId } });
    if (!existing) {
      existing = await categoryRepo.save(categoryRepo.create({ name: rawCat.name, parentId, status: 'active' }));
    }
    rawCatIdToDbId.set(rawCat.id, existing.id);
  }
  console.log(`[catalogopro-demo] Categories upserted: ${rawCatIdToDbId.size}`);

  // ─── 5. Products ────────────────────────────────────────
  const productEntities: ProductEntity[] = [];
  for (const p of selected) {
    const sku = String(p.externalId);
    let existing = await productRepo.findOneBy({ sku });
    if (existing) {
      productEntities.push(existing);
      continue;
    }
    const categoryDbId = p.categoryId != null ? rawCatIdToDbId.get(p.categoryId) ?? null : null;
    const brandDbId = p.brandId != null ? brandIdToEntity.get(p.brandId)?.id ?? null : null;
    const unitTarget = p.unit ? UNIT_MAP[p.unit] : undefined;
    const unitId = unitTarget ? unitAbbrevToId.get(unitTarget.abbreviation) ?? null : null;
    const supplier = p.supplierId != null
      ? suppliers[hashToIndex(p.supplierId, suppliers.length)]
      : suppliers[hashToIndex(p.externalId, suppliers.length)];
    const basePrice = Math.round((p.basePrice ?? 0) * 100) / 100;
    const baseCost = Math.round((p.netPrice ?? basePrice * 0.7) * 100) / 100;

    const created = await productRepo.save(productRepo.create({
      sku,
      name: p.name,
      description: p.description ?? p.categoryBreadcrumbs ?? null,
      categoryId: categoryDbId,
      brandId: brandDbId,
      unitId,
      productType: 'physical',
      basePrice,
      baseCost,
      controlsStock: true,
      minStock: Math.max(1, Math.floor((p.stock ?? 10) * 0.1)),
      status: 'active',
      tracksLot: false,
      tracksSerial: false,
      reorderPoint: Math.max(5, Math.floor((p.stock ?? 10) * 0.2)),
      leadTimeDays: randomBetween(1, 7),
      preferredSupplierId: supplier.id,
    }));
    productEntities.push(created);
  }
  console.log(`[catalogopro-demo] Products upserted: ${productEntities.length}`);

  // ─── 6. Stock per warehouse ─────────────────────────────
  // Split the source's total stock across warehouses with random weights.
  let stockRows = 0;
  for (let i = 0; i < productEntities.length; i++) {
    const prod = productEntities[i];
    const raw = selected[i];
    const total = raw.stock ?? 0;
    if (total <= 0) continue;

    const weights = warehouses.map(() => Math.random() + 0.1);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    let remaining = total;
    for (let w = 0; w < warehouses.length; w++) {
      const qty = w === warehouses.length - 1
        ? remaining
        : Math.floor((weights[w] / weightSum) * total);
      remaining -= qty;
      if (qty <= 0) continue;

      const existing = await stockRepo.findOne({
        where: { productId: prod.id, warehouseId: warehouses[w].id, variantId: undefined },
      });
      if (existing) continue;
      await stockRepo.save(stockRepo.create({
        productId: prod.id,
        variantId: null,
        warehouseId: warehouses[w].id,
        availableQty: qty,
        reservedQty: 0,
        inTransitQty: 0,
        minStock: prod.minStock,
      }));
      stockRows++;
    }
  }
  console.log(`[catalogopro-demo] Stock rows created: ${stockRows}`);

  // ─── 7. PriceList "Lista General" ───────────────────────
  let priceList = await priceListRepo.findOneBy({ name: PRICE_LIST_NAME });
  if (!priceList) {
    priceList = await priceListRepo.save(priceListRepo.create({
      name: PRICE_LIST_NAME,
      currency: 'ARS',
      status: 'active',
      isDefault: true,
      minQty: 1,
    }));
  }
  let priceItems = 0;
  for (const prod of productEntities) {
    const existing = await priceListItemRepo.findOne({
      where: { priceListId: priceList.id, productId: prod.id },
    });
    if (existing) continue;
    await priceListItemRepo.save(priceListItemRepo.create({
      priceListId: priceList.id,
      productId: prod.id,
      price: prod.basePrice,
      minQuantity: 1,
    }));
    priceItems++;
  }
  console.log(`[catalogopro-demo] PriceList "${PRICE_LIST_NAME}" items: ${priceItems}`);

  console.log('[catalogopro-demo] Done.');
}
