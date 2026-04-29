/**
 * Pulls the AppVendedores snapshot from the Razycia API, writes the raw
 * responses under `raw/`, and produces `catalog-mapped.json` in the shape
 * the catalogopro-demo seed consumes.
 *
 * Usage:
 *   RAZYCIA_TOKEN="Bearer <jwt>" npx ts-node src/seeds/demo/catalogopro/fetch-and-build.ts
 *
 * Optional env:
 *   RAZYCIA_BASE_URL   default http://api.razycia.net:11444/RazAPI
 *   RAZYCIA_ID_CLIENTE default 1 (PreciosYStocks/Combos are cliente-scoped)
 */
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.RAZYCIA_BASE_URL || 'http://api.razycia.net:11444/RazAPI';
const TOKEN = process.env.RAZYCIA_TOKEN;
const ID_CLIENTE = process.env.RAZYCIA_ID_CLIENTE || '1';
const DIR = __dirname;
const RAW = path.join(DIR, 'raw');

interface RawArticle {
  idArticulo: number;
  descripcion: string;
  descripcionApp?: string;
  descripcionLarga?: string;
  unidadMedida?: string;
  alicuotaIVA?: number;
  idMarca?: number;
  idCategoria?: number;
  idProveedor?: number;
  faltante?: string;
  codigosBarras?: Array<{ codigoBarras: string; factor: string }>;
}
interface RawCategoria {
  idCategoria: number;
  idCategoriPadre: number;
  descripcion: string;
  nivel: number;
  breadCrumbs: string;
}
interface RawMarca { idMarca: number; descripcion: string }
interface RawPrecio {
  idArticulo: number;
  idSucursal: number;
  stock: number;
  precioNeto: number;
  precioFinal: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  if (!TOKEN) throw new Error('RAZYCIA_TOKEN env var required (Bearer <jwt>).');
  const res = await fetch(url, { headers: { Authorization: TOKEN } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

async function fetchAndSave<T>(name: string, url: string): Promise<T> {
  const data = await fetchJson<T>(url);
  fs.writeFileSync(path.join(RAW, `${name}.json`), JSON.stringify(data, null, 2));
  const n = Array.isArray(data) ? (data as unknown[]).length : 1;
  console.log(`  ${name}: ${n}`);
  return data;
}

async function main() {
  fs.mkdirSync(RAW, { recursive: true });
  console.log(`[catalogopro] Fetching from ${BASE_URL} (idCliente=${ID_CLIENTE})`);

  const [articulos, categorias, marcas, _lineas, _rubros, _proveedores, precios] = await Promise.all([
    fetchAndSave<RawArticle[]>('articulos', `${BASE_URL}/api/AppVendedores/Articulos`),
    fetchAndSave<RawCategoria[]>('categorias', `${BASE_URL}/api/AppVendedores/Categorias`),
    fetchAndSave<RawMarca[]>('marcas', `${BASE_URL}/api/AppVendedores/Marcas`),
    fetchAndSave<unknown[]>('lineas', `${BASE_URL}/api/AppVendedores/Lineas`),
    fetchAndSave<unknown[]>('rubros', `${BASE_URL}/api/AppVendedores/Rubros`),
    fetchAndSave<unknown[]>('proveedores', `${BASE_URL}/api/AppVendedores/Proveedores`),
    fetchAndSave<RawPrecio[]>('precios-y-stocks', `${BASE_URL}/api/AppVendedores/PreciosYStocks?idCliente=${ID_CLIENTE}`),
  ]);

  // Keep the highest precioFinal per article across sucursales.
  const precioByArt = new Map<number, RawPrecio>();
  for (const p of precios) {
    const prev = precioByArt.get(p.idArticulo);
    if (!prev || (p.precioFinal ?? 0) > (prev.precioFinal ?? 0)) precioByArt.set(p.idArticulo, p);
  }

  const brands = marcas.map((m) => ({
    id: m.idMarca,
    name: (m.descripcion ?? '').trim() || `Marca ${m.idMarca}`,
  }));
  const brandById = new Map(brands.map((b) => [b.id, b.name]));

  const categoriesFlat = categorias.map((c) => ({
    id: c.idCategoria,
    name: c.descripcion,
    parentId: c.idCategoriPadre && c.idCategoriPadre !== 0 ? c.idCategoriPadre : null,
    level: c.nivel,
    breadcrumbs: c.breadCrumbs ?? null,
  }));
  const catById = new Map(categoriesFlat.map((c) => [c.id, c]));

  const products = articulos.map((a) => {
    const p = precioByArt.get(a.idArticulo);
    const barras = a.codigosBarras ?? [];
    const barcode = barras.find((b) => b.factor === 'U')?.codigoBarras ?? barras[0]?.codigoBarras ?? null;
    const cat = a.idCategoria ? catById.get(a.idCategoria) : undefined;
    return {
      externalId: a.idArticulo,
      sku: String(a.idArticulo),
      barcode,
      name: a.descripcionApp ?? a.descripcionLarga ?? a.descripcion ?? '',
      shortName: a.descripcion ?? '',
      description: a.descripcionLarga ?? null,
      unit: a.unidadMedida ?? null,
      taxRate: Number(a.alicuotaIVA ?? 0),
      brandId: a.idMarca ?? null,
      brandName: a.idMarca != null ? brandById.get(a.idMarca) ?? null : null,
      categoryId: a.idCategoria && a.idCategoria !== 0 ? a.idCategoria : null,
      categoryName: cat?.name ?? null,
      categoryBreadcrumbs: cat?.breadcrumbs ?? null,
      supplierId: a.idProveedor ?? null,
      basePrice: p?.precioFinal ?? null,
      netPrice: p?.precioNeto ?? null,
      stock: p?.stock ?? null,
      status: (a.faltante ?? '').toUpperCase() === 'S' ? 'inactive' : 'active',
      hasPrice: !!(p && (p.precioFinal ?? 0) > 0),
    };
  });

  const mapped = {
    source: 'razycia AppVendedores API',
    generatedAt: new Date().toISOString().slice(0, 10),
    clienteId: Number(ID_CLIENTE),
    brands,
    categoriesFlat,
    products,
  };

  const outPath = path.join(DIR, 'catalog-mapped.json');
  fs.writeFileSync(outPath, JSON.stringify(mapped));
  const eligible = products.filter(
    (p) => p.status === 'active' && p.hasPrice && (p.stock ?? 0) > 0 && (p.basePrice ?? 0) > 0,
  ).length;
  console.log(
    `[catalogopro] Wrote ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB) — ` +
    `${products.length} products, ${eligible} eligible for seed.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
