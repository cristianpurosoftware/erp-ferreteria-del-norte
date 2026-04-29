/**
 * Human-readable labels for permission names that the backend stores as
 * `resource:action` pairs (e.g. `orders:create`).
 *
 * Resolution order inside `getPermissionLabel`:
 *   1. `PERMISSION_LABELS[permission]` — explicit override.
 *   2. action in `PERMISSION_ACTION_LABELS` + resource in
 *      `PERMISSION_SECTION_LABELS` → "Crear pedidos".
 *   3. humanized fallback from `resource:action` → "Sincronizar ahora foo bar".
 *
 * Internally we still save the raw `permissionIds`; this module only affects
 * presentation in the role form.
 */

// ─── Sections ────────────────────────────────────────────────────────

export const PERMISSION_SECTION_LABELS: Record<string, string> = {
  users: "Usuarios",
  roles: "Roles",
  company: "Empresa",
  branches: "Sucursales",
  warehouses: "Depósitos",
  warehouse_locations: "Ubicaciones",
  categories: "Categorías",
  brands: "Marcas",
  units: "Unidades",
  price_lists: "Listas de precios",
  taxes: "Impuestos",
  invoice_types: "Tipos de comprobante",
  payment_conditions: "Condiciones de pago",
  payment_methods: "Medios de pago",
  customers: "Clientes",
  products: "Productos",
  inventory: "Stock",
  inventory_counts: "Conteos de inventario",
  lots: "Lotes",
  orders: "Pedidos",
  invoices: "Comprobantes",
  delivery_notes: "Remitos",
  credit_notes: "Notas de crédito",
  debit_notes: "Notas de débito",
  fiscal: "Fiscal",
  accounts: "Cuentas corrientes",
  payments: "Pagos",
  cashbox: "Caja",
  reports: "Reportes",
  audit: "Auditoría",
  integrations: "Integraciones",
  settings: "Configuración",
  sales_zones: "Zonas comerciales",
  routes: "Rutas",
  promotions: "Promociones",
  commissions: "Comisiones",
  customer_visits: "Visitas a clientes",
  picking: "Picking",
  shipments: "Envíos",
  vehicles: "Vehículos",
  drivers: "Choferes",
  dispatch_sheets: "Hojas de ruta",
  returns: "Devoluciones",
  suppliers: "Proveedores",
  purchases: "Órdenes de compra",
  supplier_invoices: "Facturas de proveedor",
  supplier_delivery_notes: "Remitos de proveedor",
  supplier_claims: "Reclamos a proveedores",
  three_way_match: "Conciliación 3 vías",
  jurisdictions: "Jurisdicciones fiscales",
  checks: "Cheques",
  bank_accounts: "Cuentas bancarias",
  bank_statements: "Extractos bancarios",
  collector_renditions: "Rendiciones de cobrador",
  reconciliation: "Conciliación",
  withholdings: "Retenciones",
  withholding_padrones: "Padrones de retención",
  payment_orders: "Órdenes de pago",
  payment_batches: "Lotes de pago",
  search: "Búsqueda global",
};

// ─── Actions ─────────────────────────────────────────────────────────

export const PERMISSION_ACTION_LABELS: Record<string, string> = {
  view: "Ver",
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
  approve: "Aprobar",
  cancel: "Cancelar",
  confirm: "Confirmar",
  reject: "Rechazar",
  receive: "Recibir",
  issue: "Emitir",
  apply: "Aplicar",
  reconcile: "Conciliar",
  export: "Exportar",
  send: "Enviar",
  submit: "Enviar para aprobación",
  resolve: "Resolver",
  print: "Imprimir",
  close: "Cerrar",
  open: "Abrir",
  manage: "Gestionar",
  dispatch: "Despachar",
  deliver: "Entregar",
  complete: "Completar",
  block: "Bloquear",
  unblock: "Desbloquear",
  discontinue: "Discontinuar",
  adjust: "Ajustar",
  transfer: "Transferir",
  reserve: "Reservar",
  release: "Liberar",
  expire: "Vencer",
  count: "Contar",
  pause: "Pausar",
  start: "Iniciar",
  pick: "Preparar",
  assign: "Asignar",
  load: "Cargar",
  depart: "Despachar salida",
  deliver_stop: "Marcar parada entregada",
  reject_stop: "Rechazar parada",
  deposit: "Depositar",
  clear: "Acreditar",
  bounce: "Rebotar",
  endorse: "Endosar",
  return: "Devolver",
  import: "Importar",
  lookup: "Consultar",
  pay: "Pagar",
  generate_file: "Generar archivo",
  mark_processed: "Marcar procesado",
  inspect: "Inspeccionar",
  dispute: "Disputar",
  match: "Conciliar",
  override: "Forzar sobrescritura",
  invoice: "Facturar",
  settle: "Liquidar",
  reverse: "Revertir",
  activate: "Activar",
  apply_cae: "Aplicar CAE",
  request_cae: "Solicitar CAE",
  cancel_cae: "Anular CAE",
  update_role: "Cambiar rol",
  update_password: "Cambiar contraseña",
  update_price: "Actualizar precio",
  update_cost: "Actualizar costo",
  override_price: "Modificar precio",
  close_with_diff: "Cerrar con diferencia",
  view_financial: "Ver financieros",
  view_logistics: "Ver logística",
  view_authorizations: "Ver autorizaciones",
};

// ─── Specific overrides ──────────────────────────────────────────────
// Only use when the `resource + action` composition is awkward.

export const PERMISSION_LABELS: Record<string, string> = {
  "orders:override_price": "Modificar precio del pedido",
  "cashbox:close_with_diff": "Cerrar caja con diferencia",
  "cashbox:manage": "Administrar cajas",
  "reports:view_financial": "Ver reportes financieros",
  "reports:view_logistics": "Ver reportes de logística",
  "fiscal:view_authorizations": "Ver autorizaciones fiscales",
  "payment_batches:generate_file": "Generar archivo de lote",
  "payment_batches:mark_processed": "Marcar lote procesado",
  "withholding_padrones:lookup": "Consultar padrón de retención",
  "withholding_padrones:import": "Importar padrón de retención",
  "users:update_role": "Cambiar rol de usuario",
  "users:update_password": "Cambiar contraseña de usuario",
  "products:update_price": "Actualizar precio de producto",
  "products:update_cost": "Actualizar costo de producto",
  "products:discontinue": "Discontinuar producto",
  "customers:block": "Bloquear cliente",
  "customers:unblock": "Desbloquear cliente",
  "invoices:request_cae": "Solicitar CAE de comprobante",
  "invoices:cancel_cae": "Anular CAE de comprobante",
  "shipments:deliver_stop": "Marcar parada entregada",
  "shipments:reject_stop": "Rechazar parada de envío",
  "delivery_notes:invoice": "Facturar remito",
  "three_way_match:override": "Forzar conciliación 3 vías",
  "search:view": "Usar búsqueda global",
  "integrations:pause": "Pausar integración",
  "bank_statements:import": "Importar extracto bancario",
  "bank_statements:reconcile": "Conciliar extracto bancario",
  "bank_statements:close": "Cerrar extracto bancario",
  "inventory:expire": "Marcar stock vencido",
};

// ─── Helpers ─────────────────────────────────────────────────────────

export function getPermissionSectionLabel(sectionKey: string): string {
  if (!sectionKey) return "Otros";
  if (PERMISSION_SECTION_LABELS[sectionKey]) return PERMISSION_SECTION_LABELS[sectionKey];
  // Humanize snake_case as fallback
  const words = sectionKey.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function humanize(token: string): string {
  return token.replace(/_/g, " ").toLowerCase();
}

export function getPermissionLabel(permissionName: string): string {
  if (!permissionName) return "—";
  if (PERMISSION_LABELS[permissionName]) return PERMISSION_LABELS[permissionName];

  const [resource, action] = permissionName.split(":");
  const resourceLabel = PERMISSION_SECTION_LABELS[resource];
  const actionLabel = action ? PERMISSION_ACTION_LABELS[action] : undefined;

  if (resourceLabel && actionLabel) {
    // "Ver pedidos", "Crear clientes", "Conciliar extractos bancarios"
    return `${actionLabel} ${resourceLabel.toLowerCase()}`;
  }
  if (resourceLabel && action) {
    // "Ordenes de compra · generar archivo" when action is unknown
    return `${resourceLabel}: ${humanize(action)}`;
  }
  if (!resource) {
    return humanize(permissionName);
  }
  // Neither side resolved — humanize both
  return `${humanize(action ?? "")} ${humanize(resource)}`.trim();
}

/**
 * Predefined sort order for actions within a section so the common CRUD
 * verbs appear first.
 */
const ACTION_ORDER: Record<string, number> = {
  view: 0,
  create: 10,
  update: 20,
  delete: 30,
  confirm: 40,
  approve: 41,
  submit: 42,
  reject: 43,
  receive: 50,
  issue: 51,
  apply: 52,
  reconcile: 53,
  dispatch: 60,
  deliver: 61,
  complete: 62,
  cancel: 70,
};

export function sortPermissions<T extends { name: string }>(perms: T[]): T[] {
  return [...perms].sort((a, b) => {
    const aAction = a.name.split(":")[1] ?? "";
    const bAction = b.name.split(":")[1] ?? "";
    const aOrder = ACTION_ORDER[aAction] ?? 999;
    const bOrder = ACTION_ORDER[bAction] ?? 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });
}
