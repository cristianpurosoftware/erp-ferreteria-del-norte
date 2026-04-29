import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../config/data-source';
import { env } from '../config/env';
import { ProductEntity } from '../modules/products/data_access/product.entity';
import { CategoryEntity } from '../modules/categories/data_access/category.entity';
import { BrandEntity } from '../modules/brands/data_access/brand.entity';
import { UnitEntity } from '../modules/units/data_access/unit.entity';
import { SupplierEntity } from '../modules/suppliers/data_access/supplier.entity';
import { WarehouseEntity } from '../modules/warehouses/data_access/warehouse.entity';
import { StockEntity } from '../modules/inventory/data_access/stock.entity';
import { PriceListEntity } from '../modules/price-lists/data_access/price-list.entity';
import { PriceListItemEntity } from '../modules/price-lists/data_access/price-list-item.entity';

interface CatalogJson {
  categories: { name: string; parent: string | null }[];
  units: { name: string; abbreviation: string; type: string }[];
  products: {
    sku: string;
    name: string;
    categoryName: string;
    subcategoryName: string | null;
    unitAbbreviation: string;
    metadata: { measure: string | null; packQty: number | null; catalogPage: number | null };
  }[];
  priceLists: {
    general: { sku: string; price: number }[];
    usd: { sku: string; price: number }[];
  };
  meta: { sourceCsv: string; generatedAt: string; productCount: number };
}

const CATALOG_PATH = path.join(__dirname, 'demo', 'ferreteria-del-norte', 'catalog-mapped.json');

const SUPPLIER_SEEDS = [
  { name: 'Distribuidora Ferretera del Sur', taxId: '30-71800001-1', primaryContact: 'Roberto Méndez', phone: '+54 11 4555-1100', email: 'ventas@distferretera.com.ar', paymentCondition: '30 dias' },
  { name: 'Importadora Tornillos S.A.', taxId: '30-71800001-2', primaryContact: 'Lucía Salinas', phone: '+54 11 4555-1200', email: 'pedidos@imptornillos.com.ar', paymentCondition: '60 dias' },
  { name: 'Mayorista Construcción Norte', taxId: '30-71800001-3', primaryContact: 'Carlos Acosta', phone: '+54 11 4555-1300', email: 'info@maycon.com.ar', paymentCondition: 'Contado' },
  { name: 'Herrajes y Cerrajería SRL', taxId: '30-71800001-4', primaryContact: 'María Cabrera', phone: '+54 11 4555-1400', email: 'contacto@herracer.com.ar', paymentCondition: '30 dias' },
  { name: 'Eléctricos Andinos S.A.', taxId: '30-71800001-5', primaryContact: 'Diego Pereyra', phone: '+54 11 4555-1500', email: 'ventas@elecandinos.com.ar', paymentCondition: '30 dias' },
];

const BRAND_SEEDS = [
  'Tramontina',
  'Bahco',
  'Stanley',
  'Black+Decker',
  'Dewalt',
  'Bosch',
  'Makita',
  'Truper',
  'Crescent',
  'Sin Marca',
];

// Hash a string deterministically into a bucket index — used to reproducibly
// pick a brand/supplier per SKU.
function hashIndex(seed: string, buckets: number): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h) ^ seed.charCodeAt(i);
  return Math.abs(h) % buckets;
}

// Realistic stock distribution: most products have moderate stock, some are low,
// a few are out. This populates the "Stock crítico" report convincingly.
function pickStockQty(seed: string): number {
  const bucket = hashIndex(seed, 100);
  if (bucket < 5) return 0;          //  5% out of stock
  if (bucket < 15) return Math.floor(Math.random() * 5) + 1;   // 10% critical (1-5)
  if (bucket < 70) return Math.floor(Math.random() * 50) + 10; // 55% normal (10-60)
  return Math.floor(Math.random() * 200) + 50;                 // 30% well-stocked (50-250)
}

function pickMinStock(qty: number): number {
  if (qty === 0) return 5;
  if (qty <= 5) return Math.max(qty + 2, 5);   // ensure "below min" stays true
  return Math.max(2, Math.floor(qty * 0.1));
}

export async function seedFerreteriaDelNorteDemo() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.warn(`[ferreteria-del-norte] Catalog JSON not found at ${CATALOG_PATH}. Run 'npx ts-node scripts/csv-to-ferreteria-catalog.ts' first.`);
    return;
  }
  const catalog: CatalogJson = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  console.log(`[ferreteria-del-norte] Loaded catalog: ${catalog.products.length} products, ${catalog.categories.length} categories.`);

  const productRepo = AppDataSource.getRepository(ProductEntity);
  const categoryRepo = AppDataSource.getRepository(CategoryEntity);
  const brandRepo = AppDataSource.getRepository(BrandEntity);
  const unitRepo = AppDataSource.getRepository(UnitEntity);
  const supplierRepo = AppDataSource.getRepository(SupplierEntity);
  const warehouseRepo = AppDataSource.getRepository(WarehouseEntity);
  const stockRepo = AppDataSource.getRepository(StockEntity);
  const priceListRepo = AppDataSource.getRepository(PriceListEntity);
  const priceListItemRepo = AppDataSource.getRepository(PriceListItemEntity);

  // ─── 0. Pre-requisites ────────────────────────────────
  const warehouses = await warehouseRepo.find({ where: { status: 'active' } });
  if (warehouses.length === 0) {
    throw new Error('[ferreteria-del-norte] No active warehouses. Run base seed (`npm run seed`) first.');
  }
  console.log(`[ferreteria-del-norte] ${warehouses.length} warehouses found: ${warehouses.map((w) => w.name).join(', ')}.`);

  // ─── 1. Suppliers ────────────────────────────────────
  for (const s of SUPPLIER_SEEDS) {
    const existing = await supplierRepo.findOneBy({ taxId: s.taxId });
    if (!existing) await supplierRepo.save(supplierRepo.create({ ...s, status: 'active' }));
  }
  const suppliers = await supplierRepo.find({ where: { status: 'active' } });
  console.log(`[ferreteria-del-norte] ${suppliers.length} suppliers ready.`);

  // ─── 2. Brands ───────────────────────────────────────
  const brands: BrandEntity[] = [];
  for (const name of BRAND_SEEDS) {
    let existing = await brandRepo.findOneBy({ name });
    if (!existing) existing = await brandRepo.save(brandRepo.create({ name, status: 'active' }));
    brands.push(existing);
  }
  console.log(`[ferreteria-del-norte] ${brands.length} brands ready.`);

  // ─── 3. Units (upsert from catalog) ──────────────────
  const unitAbbrToId = new Map<string, string>();
  for (const u of catalog.units) {
    let existing = await unitRepo.findOneBy({ abbreviation: u.abbreviation });
    if (!existing) existing = await unitRepo.save(unitRepo.create(u));
    unitAbbrToId.set(u.abbreviation, existing.id);
  }
  console.log(`[ferreteria-del-norte] ${unitAbbrToId.size} catalog units ready.`);

  // ─── 4. Categories (parents first, then children) ────
  const catNameToId = new Map<string, string>();
  // parents first
  for (const c of catalog.categories.filter((c) => !c.parent)) {
    let existing = await categoryRepo.findOne({ where: { name: c.name, parentId: undefined as any } });
    if (!existing) existing = await categoryRepo.findOne({ where: { name: c.name } });
    if (!existing) existing = await categoryRepo.save(categoryRepo.create({ name: c.name, status: 'active' }));
    catNameToId.set(c.name, existing.id);
  }
  // then children
  for (const c of catalog.categories.filter((c) => !!c.parent)) {
    const parentId = catNameToId.get(c.parent!) ?? null;
    let existing = await categoryRepo.findOne({ where: { name: c.name, parentId: parentId as any } });
    if (!existing) existing = await categoryRepo.save(categoryRepo.create({ name: c.name, parentId, status: 'active' }));
    catNameToId.set(`${c.parent}::${c.name}`, existing.id);
    if (!catNameToId.has(c.name)) catNameToId.set(c.name, existing.id); // best-effort fallback
  }
  console.log(`[ferreteria-del-norte] ${catNameToId.size} category mappings ready.`);

  // ─── 5. Price Lists (3) ──────────────────────────────
  async function ensurePriceList(name: string, currency: string, isDefault = false): Promise<PriceListEntity> {
    let existing = await priceListRepo.findOneBy({ name });
    if (!existing) {
      existing = await priceListRepo.save(priceListRepo.create({ name, currency, status: 'active', isDefault }));
    }
    return existing;
  }
  const listGeneral = await ensurePriceList('Lista General', 'ARS', true);
  const listUSD = await ensurePriceList('Lista USD', 'USD', false);
  const listMayorista = await ensurePriceList('Lista Mayorista', 'ARS', false);
  console.log(`[ferreteria-del-norte] Price lists: ${listGeneral.name}, ${listUSD.name}, ${listMayorista.name}`);

  const priceMapARS = new Map(catalog.priceLists.general.map((p) => [p.sku, p.price]));
  const priceMapUSD = new Map(catalog.priceLists.usd.map((p) => [p.sku, p.price]));

  // ─── 6. Products ─────────────────────────────────────
  console.log(`[ferreteria-del-norte] Importing ${catalog.products.length} products…`);
  let imported = 0;
  let skippedExisting = 0;
  const productIds: string[] = [];
  for (const p of catalog.products) {
    const existing = await productRepo.findOneBy({ sku: p.sku });
    if (existing) {
      productIds.push(existing.id);
      skippedExisting++;
      continue;
    }
    const subcatKey = p.subcategoryName ? `${p.categoryName}::${p.subcategoryName}` : p.categoryName;
    const categoryId =
      catNameToId.get(subcatKey) ?? catNameToId.get(p.categoryName) ?? null;
    const unitId = unitAbbrToId.get(p.unitAbbreviation) ?? null;
    const brand = brands[hashIndex(p.sku, brands.length)];
    const supplier = suppliers[hashIndex(p.sku + 'sup', suppliers.length)];
    const basePrice = priceMapARS.get(p.sku) ?? 0;
    const baseCost = Math.round(basePrice * 0.65 * 100) / 100;

    const entity = productRepo.create({
      sku: p.sku,
      name: p.name,
      description: p.metadata.measure ?? null,
      categoryId,
      brandId: brand.id,
      unitId,
      productType: 'physical',
      basePrice,
      baseCost,
      controlsStock: true,
      minStock: 0, // will be set per-stock row instead
      status: 'active',
      tracksLot: false,
      tracksSerial: false,
      reorderPoint: 0,
      leadTimeDays: 7,
      preferredSupplierId: supplier.id,
      metadata: p.metadata,
    } as Partial<ProductEntity>) as ProductEntity;
    const created = (await productRepo.save(entity)) as ProductEntity;
    productIds.push(created.id);
    imported++;
  }
  console.log(`[ferreteria-del-norte] Products imported: ${imported} (skipped ${skippedExisting} already-present).`);

  // ─── 7. Stock per product per warehouse ──────────────
  let stockRows = 0;
  for (let i = 0; i < productIds.length; i++) {
    const productId = productIds[i];
    for (const wh of warehouses) {
      const existing = await stockRepo.findOne({
        where: { productId, warehouseId: wh.id, variantId: undefined as any },
      });
      if (existing) continue;
      const seed = `${productId}:${wh.id}`;
      const qty = pickStockQty(seed);
      const minStock = pickMinStock(qty);
      await stockRepo.save(stockRepo.create({
        productId,
        warehouseId: wh.id,
        variantId: null,
        availableQty: qty,
        reservedQty: 0,
        inTransitQty: 0,
        minStock,
      }));
      stockRows++;
    }
    if (i > 0 && i % 500 === 0) {
      console.log(`[ferreteria-del-norte]   …${i}/${productIds.length} products stocked`);
    }
  }
  console.log(`[ferreteria-del-norte] ${stockRows} stock rows created.`);

  // ─── 8. Price list items (3 lists × N products) ──────
  let priceItems = 0;
  for (let i = 0; i < productIds.length; i++) {
    const productId = productIds[i];
    const sku = catalog.products[i].sku;
    const ars = priceMapARS.get(sku);
    const usdPrice = priceMapUSD.get(sku);
    if (ars !== undefined) {
      const exists = await priceListItemRepo.findOne({ where: { priceListId: listGeneral.id, productId } });
      if (!exists) {
        await priceListItemRepo.save(priceListItemRepo.create({
          priceListId: listGeneral.id, productId, price: ars, minQuantity: 1,
        }));
        priceItems++;
      }
      const mayorista = Math.round(ars * 0.85 * 100) / 100; // 15% off for wholesale
      const existsM = await priceListItemRepo.findOne({ where: { priceListId: listMayorista.id, productId } });
      if (!existsM) {
        await priceListItemRepo.save(priceListItemRepo.create({
          priceListId: listMayorista.id, productId, price: mayorista, minQuantity: 1,
        }));
        priceItems++;
      }
    }
    if (usdPrice !== undefined) {
      const exists = await priceListItemRepo.findOne({ where: { priceListId: listUSD.id, productId } });
      if (!exists) {
        await priceListItemRepo.save(priceListItemRepo.create({
          priceListId: listUSD.id, productId, price: usdPrice, minQuantity: 1,
        }));
        priceItems++;
      }
    }
    if (i > 0 && i % 1000 === 0) {
      console.log(`[ferreteria-del-norte]   …${i}/${productIds.length} products priced`);
    }
  }
  console.log(`[ferreteria-del-norte] ${priceItems} price-list items created.`);

  console.log('[ferreteria-del-norte] Catalog seed complete.');
}

// Standalone runner for `npm run seed:ferreteria`.
async function runStandalone() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');
    await seedFerreteriaDelNorteDemo();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runStandalone();
}
