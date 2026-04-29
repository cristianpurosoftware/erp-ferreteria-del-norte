/**
 * Pre-bake the Ferretería del Norte CSV catalog into a deterministic JSON the
 * seed reads at runtime. Done as a build-time step so the seed container does
 * not need filesystem access to the original CSV.
 *
 * Input:  Ferretera_del_Norte_catalogo_con_precios.csv at the repo root
 * Output: api/src/seeds/demo/ferreteria-del-norte/catalog-mapped.json
 *
 * Run with: `npx ts-node api/scripts/csv-to-ferreteria-catalog.ts`
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CSV_PATH = path.join(REPO_ROOT, 'Ferretera_del_Norte_catalogo_con_precios.csv');
const OUT_PATH = path.join(
  __dirname,
  '..',
  'src',
  'seeds',
  'demo',
  'ferreteria-del-norte',
  'catalog-mapped.json',
);

interface RawRow {
  codigo: string;
  categoria: string;
  subcategoria: string;
  articulo: string;
  medida: string;
  unidadDeVenta: string;
  cantidadPorCaja: string;
  precioARS: string;
  precioUSD: string;
  pagina: string;
}

interface MappedProduct {
  sku: string;
  name: string;
  categoryName: string;
  subcategoryName: string | null;
  unitAbbreviation: string;
  metadata: {
    measure: string | null;
    packQty: number | null;
    catalogPage: number | null;
  };
}

interface MappedPriceItem {
  sku: string;
  price: number;
}

interface CatalogJson {
  categories: { name: string; parent: string | null }[];
  units: { name: string; abbreviation: string; type: string }[];
  products: MappedProduct[];
  priceLists: {
    general: MappedPriceItem[];
    usd: MappedPriceItem[];
  };
  meta: {
    sourceCsv: string;
    generatedAt: string;
    productCount: number;
  };
}

// CSV line parser — handles double-quoted fields with embedded "" escapes.
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === ',') {
        fields.push(current);
        current = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// Map raw "Unidad de Venta" string from the CSV to a canonical unit abbreviation
// that already exists (or will exist) in the master-data seed.
const UNIT_LOOKUP: Record<string, string> = {
  '': 'un',
  'c/u': 'un',
  'cu': 'un',
  'unidad': 'un',
  'caja': 'cj',
  'paq': 'pq',
  'paquete': 'pq',
  'metro': 'm',
  'm.': 'm',
  'mt': 'm',
  'mts': 'm',
  'kg': 'kg',
  'kgs': 'kg',
  'lt': 'lt',
  'litro': 'lt',
  'rollo': 'rol',
  'bolsa': 'bls',
  'atado': 'ato',
  'par': 'par',
  'jgo': 'jgo',
  'juego': 'jgo',
};

function mapUnit(rawUnit: string, medida: string): string {
  const cleaned = rawUnit.trim().toLowerCase().replace(/\s+/g, ' ');
  if (cleaned in UNIT_LOOKUP) return UNIT_LOOKUP[cleaned];
  // Heuristic: if "medida" contains "c/u" or "mm c/u", default to unit
  if (/c\/u/i.test(medida)) return 'un';
  if (/\bm\b|\bmt\b/i.test(medida)) return 'm';
  if (/\bkg\b/i.test(medida)) return 'kg';
  return 'un';
}

function parseNumber(raw: string): number | null {
  if (!raw || raw.trim() === '') return null;
  const cleaned = raw.replace(/[^\d.,-]/g, '').replace(/,/g, '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found at ${CSV_PATH}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    console.error('CSV is empty or has no data rows.');
    process.exit(1);
  }

  // First line is header — skip.
  const dataLines = lines.slice(1);

  const products: MappedProduct[] = [];
  const general: MappedPriceItem[] = [];
  const usd: MappedPriceItem[] = [];
  const categoriesSet = new Map<string, string | null>(); // name → parent name (null for top-level)
  const unitsSet = new Set<string>();

  let skipped = 0;
  for (const line of dataLines) {
    const fields = parseCsvLine(line);
    if (fields.length < 8) {
      skipped++;
      continue;
    }
    const row: RawRow = {
      codigo: (fields[0] ?? '').trim(),
      categoria: (fields[1] ?? '').trim(),
      subcategoria: (fields[2] ?? '').trim(),
      articulo: (fields[3] ?? '').trim(),
      medida: (fields[4] ?? '').trim(),
      unidadDeVenta: (fields[5] ?? '').trim(),
      cantidadPorCaja: (fields[6] ?? '').trim(),
      precioARS: (fields[7] ?? '').trim(),
      precioUSD: (fields[8] ?? '').trim(),
      pagina: (fields[9] ?? '').trim(),
    };
    if (!row.codigo || !row.articulo || !row.categoria) {
      skipped++;
      continue;
    }

    // Categoría siempre top-level. Subcategoría como hijo (cuando existe).
    if (!categoriesSet.has(row.categoria)) categoriesSet.set(row.categoria, null);
    const subcategoryName = row.subcategoria || null;
    if (subcategoryName && !categoriesSet.has(subcategoryName)) {
      categoriesSet.set(subcategoryName, row.categoria);
    }

    const unitAbbr = mapUnit(row.unidadDeVenta, row.medida);
    unitsSet.add(unitAbbr);

    const packQty = parseNumber(row.cantidadPorCaja);
    const page = parseNumber(row.pagina);

    products.push({
      sku: row.codigo,
      name: row.articulo,
      categoryName: row.categoria,
      subcategoryName,
      unitAbbreviation: unitAbbr,
      metadata: {
        measure: row.medida || null,
        packQty: packQty,
        catalogPage: page !== null ? Math.round(page) : null,
      },
    });

    const priceARS = parseNumber(row.precioARS);
    const priceUSD = parseNumber(row.precioUSD);
    if (priceARS !== null) general.push({ sku: row.codigo, price: priceARS });
    if (priceUSD !== null) usd.push({ sku: row.codigo, price: priceUSD });
  }

  const categories = [...categoriesSet.entries()].map(([name, parent]) => ({ name, parent }));

  // Map abbreviations that ended up referenced to their full name+type for the seed
  // to upsert against the units catalog.
  const UNIT_CATALOG: Record<string, { name: string; type: string }> = {
    un: { name: 'Unidad', type: 'count' },
    kg: { name: 'Kilogramo', type: 'weight' },
    lt: { name: 'Litro', type: 'volume' },
    m: { name: 'Metro', type: 'length' },
    cj: { name: 'Caja', type: 'count' },
    pq: { name: 'Paquete', type: 'count' },
    bls: { name: 'Bolsa', type: 'count' },
    ato: { name: 'Atado', type: 'count' },
    par: { name: 'Par', type: 'count' },
    jgo: { name: 'Juego', type: 'count' },
    rol: { name: 'Rollo', type: 'count' },
  };
  const units = [...unitsSet].map((abbr) => ({
    abbreviation: abbr,
    name: UNIT_CATALOG[abbr]?.name ?? abbr.toUpperCase(),
    type: UNIT_CATALOG[abbr]?.type ?? 'count',
  }));

  const out: CatalogJson = {
    categories,
    units,
    products,
    priceLists: { general, usd },
    meta: {
      sourceCsv: path.basename(CSV_PATH),
      generatedAt: new Date().toISOString(),
      productCount: products.length,
    },
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf-8');

  console.log(`✓ Wrote ${OUT_PATH}`);
  console.log(`  ${products.length} products | ${categories.length} categories | ${units.length} units`);
  console.log(`  ${general.length} ARS prices | ${usd.length} USD prices`);
  if (skipped > 0) console.log(`  (skipped ${skipped} malformed rows)`);
}

main();
