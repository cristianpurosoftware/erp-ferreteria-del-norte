import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sidebarPath = path.join(root, 'components/dashboard/sidebar.tsx');
const navItemsPath = path.join(root, 'lib/command-palette/nav-items.ts');
const customerPagePath = path.join(root, 'app/(app)/clientes/page.tsx');
const customerFormPath = path.join(root, 'components/forms/customer-form.tsx');
const ferreteriaSeedPath = path.join(root, '../api/src/seeds/ferreteria-del-norte-demo.seed.ts');

const sidebarSource = fs.readFileSync(sidebarPath, 'utf8');
const navItemsSource = fs.readFileSync(navItemsPath, 'utf8');
const customerPageSource = fs.readFileSync(customerPagePath, 'utf8');
const customerFormSource = fs.readFileSync(customerFormPath, 'utf8');
const ferreteriaSeedSource = fs.readFileSync(ferreteriaSeedPath, 'utf8');

const setMatch = sidebarSource.match(/const FERRETERIA_DEMO_ALLOWED_HREFS = new Set\(\[([\s\S]*?)\]\);/);
if (!setMatch) {
  throw new Error('No se encontró FERRETERIA_DEMO_ALLOWED_HREFS en components/dashboard/sidebar.tsx');
}

const allowedHrefs = [...setMatch[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
const allowedHrefSet = new Set(allowedHrefs);

const requiredHrefs = [
  '/pos',
  '/dashboard',
  '/catalogo',
  '/stock/cantidades',
  '/stock/movimientos',
  '/caja',
  '/clientes',
  '/comprobantes',
  '/comprobantes/remitos',
  '/reportes/ventas',
  '/reportes/stock',
  '/configuracion/empresa',
];

const forbiddenHrefs = [
  '/pedidos',
  '/stock/lotes',
  '/stock/ubicaciones',
  '/stock/vencimientos',
  '/comercial/zonas',
  '/comercial/rutas',
  '/comercial/promociones',
  '/comercial/comisiones',
  '/logistica/picking',
  '/logistica/envios',
  '/logistica/hojas-de-ruta',
  '/logistica/vehiculos',
  '/logistica/choferes',
  '/logistica/devoluciones',
  '/logistica/conteos',
  '/compras',
  '/compras/remitos-proveedor',
  '/compras/facturas',
  '/compras/reclamos',
  '/comprobantes/notas-credito',
  '/comprobantes/notas-debito',
  '/fiscal/autorizaciones',
  '/tesoreria/cuentas-bancarias',
  '/tesoreria/cheques',
  '/tesoreria/conciliacion',
  '/tesoreria/retenciones',
  '/tesoreria/ordenes-pago',
  '/tesoreria/batches',
  '/tesoreria/rendiciones',
  '/reportes/rentabilidad',
  '/reportes/avanzados',
  '/equipo/usuarios',
  '/equipo/roles',
  '/equipo/actividad',
  '/auditoria',
  '/integraciones',
  '/soporte',
];

const failures = [];
for (const href of requiredHrefs) {
  if (!allowedHrefSet.has(href)) failures.push(`Falta href requerido para demo ferretería: ${href}`);
}
for (const href of forbiddenHrefs) {
  if (allowedHrefSet.has(href)) failures.push(`Href avanzado/no prioritario no debe estar en scope ferretería: ${href}`);
}

if (!sidebarSource.includes('getDemoScopedNavGroups()')) {
  failures.push('La sidebar no aplica getDemoScopedNavGroups().');
}
if (!navItemsSource.includes('getDemoScopedNavGroups()')) {
  failures.push('La command palette no aplica getDemoScopedNavGroups().');
}
if (!sidebarSource.includes('Mostrador / POS')) {
  failures.push('Falta framing comercial Mostrador / POS para la demo.');
}
if (!sidebarSource.includes('Facturación')) {
  failures.push('Falta framing comercial Facturación para la demo.');
}

if (!customerPageSource.includes('hideDistributionFields={isFerreteriaDemoScope}')) {
  failures.push('Clientes no pasa hideDistributionFields según scope ferretería.');
}
if (!customerPageSource.includes('!isFerreteriaDemoScope') || !customerPageSource.includes('id: "zoneId"') || !customerPageSource.includes('id: "routeId"')) {
  failures.push('Clientes debe condicionar columnas/filtros Zona y Ruta fuera de scope ferretería.');
}
if (!customerFormSource.includes('hideDistributionFields?: boolean') || !customerFormSource.includes('!hideDistributionFields')) {
  failures.push('CustomerForm no expone/usa hideDistributionFields para ocultar campos de distribución.');
}
for (const forbiddenField of ['Vendedor asignado', '<Label>Zona</Label>', '<Label>Ruta</Label>']) {
  if (!customerFormSource.includes(forbiddenField)) {
    failures.push(`CustomerForm perdió el campo distribuidora esperado para demos no ferretería: ${forbiddenField}`);
  }
}
for (const strippedField of ['assignedSellerId', 'zoneId', 'routeId']) {
  if (!customerFormSource.includes(strippedField)) {
    failures.push(`CustomerForm no limpia campo distribuidora al operar en scope ferretería: ${strippedField}`);
  }
}
const retailCustomerCount = (ferreteriaSeedSource.match(/taxId: '30-7191000|taxId: '20-27191004|taxId: '27-30191006/g) ?? []).length;
if (retailCustomerCount < 6) {
  failures.push(`Seed ferretería debe incluir al menos 6 clientes retail de ejemplo; encontrados: ${retailCustomerCount}`);
}
if (!ferreteriaSeedSource.includes('assignedSellerId: null') || !ferreteriaSeedSource.includes('zoneId: null') || !ferreteriaSeedSource.includes('routeId: null')) {
  failures.push('Seed ferretería debe crear clientes retail sin vendedor, zona ni ruta de distribución.');
}

function routeHasPage(href) {
  const relative = href.replace(/^\//, '');
  const candidates = [
    path.join(root, 'app/(app)', relative, 'page.tsx'),
    path.join(root, 'app', relative, 'page.tsx'),
  ];
  return candidates.some((candidate) => fs.existsSync(candidate));
}

for (const href of allowedHrefs) {
  if (!routeHasPage(href)) failures.push(`Href permitido sin page.tsx: ${href}`);
}

if (failures.length > 0) {
  console.error('Scope demo Ferretería inválido:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Scope demo Ferretería OK: ${allowedHrefs.length} rutas permitidas, ${forbiddenHrefs.length} rutas avanzadas/no prioritarias bloqueadas.`);
