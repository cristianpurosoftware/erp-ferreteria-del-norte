// ============================================================
// TYPES — ERP Base Frontend
// Aligned with API entity shapes (English naming)
// UI labels remain in Spanish
// ============================================================

// ─── Common ──────────────────────────────────────────────────

interface BaseFields {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  metadata: Record<string, unknown> | null;
}

// ─── Label Maps (Spanish translations for enum values) ──────

export const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending_confirmation: 'Pend. confirmación',
  confirmed: 'Confirmado',
  stock_reserved: 'Stock reservado',
  in_preparation: 'En preparación',
  ready_to_dispatch: 'Listo para despacho',
  dispatched: 'Despachado',
  delivered: 'Entregado',
  completed: 'Completado',
  cancelled: 'Cancelado',
  rejected: 'Rechazado',
  returned: 'Devuelto',
  partially_delivered: 'Entrega parcial',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  check: 'Cheque',
  other: 'Otro',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  registered: 'Registrado',
  applied: 'Aplicado',
  reconciled: 'Conciliado',
  cancelled: 'Cancelado',
  failed: 'Fallido',
};

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  physical: 'Físico',
  service: 'Servicio',
  digital: 'Digital',
  kit: 'Kit',
};

/**
 * Audit action labels. The audit log stores actions in two shapes:
 *   1. Fully-qualified events: `order.created`, `dispatch_sheet.created`.
 *   2. Short action verbs: `created`, `updated`, `login`.
 *
 * We cover both so `formatAuditAction()` below can fall back cleanly:
 * full match → short suffix → humanized.
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  // Short action verbs (past tense, as emitted by state machines)
  created: 'Creación',
  updated: 'Actualización',
  deleted: 'Eliminación',
  deactivated: 'Desactivación',
  confirmed: 'Confirmación',
  dispatched: 'Despacho',
  delivered: 'Entrega',
  completed: 'Completado',
  cancelled: 'Cancelación',
  rejected: 'Rechazo',
  registered: 'Registro',
  applied: 'Aplicación',
  reconciled: 'Conciliación',
  issued: 'Emisión',
  voided: 'Anulación',
  accepted: 'Aceptación',
  opened: 'Apertura',
  closed: 'Cierre',
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  adjustment: 'Ajuste',
  submitted: 'Envío',
  approved: 'Aprobación',
  paid: 'Pago',
  reversed: 'Reversión',
  picked: 'Preparado',
  loaded: 'Cargado',
  departed: 'Salida',

  // Backwards-compat aliases for legacy non-past-tense keys
  create: 'Creación',
  update: 'Actualización',
  delete: 'Eliminación',
  confirm: 'Confirmación',
  dispatch: 'Despacho',
  deliver: 'Entrega',
  apply: 'Aplicación',
  open: 'Apertura',
  close: 'Cierre',
  issue: 'Emisión',

  // Fully-qualified events (override the generic form with richer wording)
  'order.created': 'Pedido creado',
  'order.updated': 'Pedido modificado',
  'order.confirmed': 'Pedido confirmado',
  'order.dispatched': 'Pedido despachado',
  'order.delivered': 'Pedido entregado',
  'order.cancelled': 'Pedido cancelado',
  'order.completed': 'Pedido completado',
  'order.blocked_by_credit': 'Pedido bloqueado por crédito',
  'customer.created': 'Cliente creado',
  'customer.updated': 'Cliente modificado',
  'customer.blocked': 'Cliente bloqueado',
  'product.created': 'Producto creado',
  'product.updated': 'Producto modificado',
  'invoice.issued': 'Comprobante emitido',
  'invoice.accepted': 'Comprobante aceptado',
  'invoice.voided': 'Comprobante anulado',
  'payment.registered': 'Pago registrado',
  'payment.applied': 'Pago aplicado',
  'payment.reconciled': 'Pago conciliado',
  'cashbox.opened': 'Caja abierta',
  'cashbox.closed': 'Caja cerrada',
  'cashbox.closed_with_diff': 'Caja cerrada con diferencia',
  'dispatch_sheet.created': 'Hoja de ruta creada',
  'dispatch_sheet.closed': 'Hoja de ruta cerrada',
  'shipment.created': 'Envío creado',
  'shipment.dispatched': 'Envío despachado',
  'shipment.completed': 'Envío completado',
  'stock.adjusted': 'Ajuste de stock',
  'stock.low': 'Stock bajo mínimo',
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  order: 'Pedido',
  customer: 'Cliente',
  product: 'Producto',
  payment: 'Pago',
  invoice: 'Comprobante',
  user: 'Usuario',
  cashbox: 'Caja',
  cashbox_session: 'Sesión de caja',
  stock: 'Stock',
  shipment: 'Envío',
  dispatch_sheet: 'Hoja de ruta',
  picking_task: 'Tarea de picking',
  supplier: 'Proveedor',
  supplier_invoice: 'Factura de proveedor',
  credit_note: 'Nota de crédito',
  debit_note: 'Nota de débito',
  delivery_note: 'Remito',
  purchase_order: 'Orden de compra',
  check: 'Cheque',
  bank_account: 'Cuenta bancaria',
  account: 'Cuenta corriente',
  account_entry: 'Movimiento de cuenta',
  role: 'Rol',
  permission: 'Permiso',
  return_order: 'Devolución',
  inventory_count: 'Conteo de inventario',
  lot: 'Lote',
  warehouse: 'Depósito',
  warehouse_location: 'Ubicación',
  promotion: 'Promoción',
  commission: 'Comisión',
  sales_zone: 'Zona',
  route: 'Ruta',
};

const AUDIT_ACTOR_LABELS: Record<string, string> = {
  user: 'Usuario',
  system: 'Sistema',
  agent: 'Agente',
  integration: 'Integración',
};

/**
 * Resolves a stored action string (fully-qualified or short) into a Spanish
 * label. Tries full match first, then the last segment after `.`, then
 * humanizes snake_case as a last resort so we never render raw keys.
 */
export function formatAuditAction(raw: string | null | undefined): string {
  if (!raw) return '—';
  if (AUDIT_ACTION_LABELS[raw]) return AUDIT_ACTION_LABELS[raw];
  const last = raw.split('.').pop() ?? raw;
  if (AUDIT_ACTION_LABELS[last]) return AUDIT_ACTION_LABELS[last];
  // Humanize: "stock.low_warning" → "Stock · low warning"
  const words = raw.replace(/_/g, ' ').replace(/\./g, ' · ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatAuditEntity(raw: string | null | undefined): string {
  if (!raw) return '—';
  if (AUDIT_ENTITY_LABELS[raw]) return AUDIT_ENTITY_LABELS[raw];
  const words = raw.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatAuditActor(type: string | null | undefined): string {
  if (!type) return 'Sistema';
  if (AUDIT_ACTOR_LABELS[type]) return AUDIT_ACTOR_LABELS[type];
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export const CUSTOMER_CATEGORY_LABELS: Record<string, string> = {
  A: 'A — Clave',
  B: 'B — Regular',
  C: 'C — Ocasional',
};

export const CREDIT_POLICY_LABELS: Record<string, string> = {
  normal: 'Normal',
  strict: 'Estricta',
  blocked: 'Bloqueado',
};

export const OPERATION_TYPE_LABELS: Record<string, string> = {
  sale: 'Venta',
  sample: 'Muestra',
  donation: 'Donación',
  internal: 'Consumo interno',
};

export const PROMOTION_KIND_LABELS: Record<string, string> = {
  discount_pct: 'Descuento %',
  discount_amount: 'Descuento $',
  'nx+m': 'N x M (lleva M paga N)',
  combo: 'Combo',
  price_override: 'Precio fijo',
};

export const PROMOTION_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activa',
  expired: 'Vencida',
  cancelled: 'Cancelada',
};

export const COMMISSION_STATUS_LABELS: Record<string, string> = {
  accrued: 'Devengada',
  approved: 'Aprobada',
  paid: 'Pagada',
  reversed: 'Revertida',
};

export const VISIT_RESULT_LABELS: Record<string, string> = {
  ordered: 'Pedido tomado',
  no_order: 'Sin pedido',
  closed: 'Cerrado',
  absent: 'Ausente',
};

export const VISIT_WINDOW_LABELS: Record<string, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  all_day: 'Todo el día',
};

export const ROUTE_FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  custom: 'Personalizada',
};

export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

export const LOT_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  blocked: 'Bloqueado',
  expired: 'Vencido',
  consumed: 'Consumido',
};

export const LOCATION_KIND_LABELS: Record<string, string> = {
  pick: 'Pick (picking)',
  bulk: 'Bulk (bulto grande)',
  quarantine: 'Cuarentena',
  returns: 'Devoluciones',
  staging: 'Staging (preparado)',
};

// Fase 3 — Logística
export const PICKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  assigned: 'Asignada',
  in_progress: 'En curso',
  picked: 'Pickeada',
  staged: 'Staged',
  cancelled: 'Cancelada',
};

export const PICKING_ITEM_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  picked: 'Pickeada',
  short: 'Faltante',
  skipped: 'Omitida',
};

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  planned: 'Planificado',
  loaded: 'Cargado',
  in_transit: 'En tránsito',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export const SHIPMENT_STOP_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  arrived: 'Arribada',
  delivered: 'Entregada',
  partial: 'Parcial',
  rejected: 'Rechazada',
  not_visited: 'No visitada',
};

export const VEHICLE_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  maintenance: 'En mantenimiento',
  retired: 'De baja',
};

export const DRIVER_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
};

export const DISPATCH_SHEET_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  printed: 'Impresa',
  dispatched: 'Despachada',
  closed: 'Cerrada',
};

export const RETURN_KIND_LABELS: Record<string, string> = {
  not_delivered: 'No entregado',
  rejected_by_customer: 'Rechazo del cliente',
  damaged: 'Dañado',
  expired: 'Vencido',
  commercial: 'Comercial',
};

export const RETURN_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  confirmed: 'Confirmada',
  received: 'Recibida',
  inspected: 'Inspeccionada',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
};

export const RETURN_CONDITION_LABELS: Record<string, string> = {
  resellable: 'Revendible',
  damaged: 'Dañado',
  expired: 'Vencido',
  quarantine: 'Cuarentena',
};

export const INVENTORY_COUNT_KIND_LABELS: Record<string, string> = {
  cycle: 'Cíclico',
  full: 'Total',
  spot: 'Puntual',
};

export const INVENTORY_COUNT_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  in_progress: 'En curso',
  pending_approval: 'Pend. aprobación',
  approved: 'Aprobado',
  applied: 'Aplicado',
  cancelled: 'Cancelado',
};

// Fase 4 — Compras avanzadas
export const SUPPLIER_INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending_approval: 'Pend. aprobación',
  matched: 'Conciliada',
  approved: 'Aprobada',
  paid: 'Pagada',
  cancelled: 'Cancelada',
  disputed: 'En disputa',
};

export const SUPPLIER_DELIVERY_NOTE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  received: 'Recibido',
  closed: 'Cerrado',
};

export const THREE_WAY_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  matched: 'Conciliado',
  discrepancy: 'Con discrepancia',
  overridden: 'Override manual',
};

export const SUPPLIER_CLAIM_KIND_LABELS: Record<string, string> = {
  short_qty: 'Faltante',
  damaged: 'Dañado',
  wrong_sku: 'SKU incorrecto',
  overpricing: 'Sobreprecio',
  missing_cae: 'Sin CAE',
};

export const SUPPLIER_CLAIM_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviado',
  acknowledged: 'Reconocido',
  credit_received: 'Crédito recibido',
  resolved: 'Resuelto',
  rejected: 'Rechazado',
};

export const INVOICE_TYPE_LABELS: Record<string, string> = {
  A: 'Factura A',
  B: 'Factura B',
  C: 'Factura C',
  E: 'Factura E',
};

// Fase 5 — Fiscal AR
export const DELIVERY_NOTE_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  issued: 'Emitido',
  invoiced: 'Facturado',
  cancelled: 'Cancelado',
};

export const CREDIT_NOTE_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending_issue: 'Pend. emisión',
  issued: 'Emitida',
  applied: 'Aplicada',
  voided: 'Anulada',
};

export const FISCAL_AUTH_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  expired: 'Expirada',
};

export const JURISDICTION_KIND_LABELS: Record<string, string> = {
  national: 'Nacional',
  provincial: 'Provincial',
  municipal: 'Municipal',
};

// Fase 6 — Tesorería
export const CHECK_STATUS_LABELS: Record<string, string> = {
  received: 'Recibido',
  in_portfolio: 'En cartera',
  deposited: 'Depositado',
  cleared: 'Acreditado',
  bounced: 'Rebotado',
  endorsed: 'Endosado',
  returned_to_customer: 'Devuelto',
  cancelled: 'Cancelado',
};

export const CHECK_KIND_LABELS: Record<string, string> = {
  common: 'Común',
  deferred: 'Diferido',
};

export const RENDITION_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'Enviada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

export const WITHHOLDING_KIND_LABELS: Record<string, string> = {
  iibb: 'IIBB',
  ganancias: 'Ganancias',
  iva: 'IVA',
  suss: 'SUSS',
};

export const WITHHOLDING_DIRECTION_LABELS: Record<string, string> = {
  suffered: 'Sufrida',
  applied: 'Aplicada',
};

export const PAYMENT_ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  approved: 'Aprobada',
  paid: 'Pagada',
  cancelled: 'Cancelada',
};

export const PAYMENT_BATCH_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  file_generated: 'Archivo generado',
  processed: 'Procesado',
  failed: 'Fallido',
};

export const BANK_STATEMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  partially_reconciled: 'Parcial',
  reconciled: 'Conciliado',
};

export const PAYMENT_DIRECTION_LABELS: Record<string, string> = {
  in: 'Cobro',
  out: 'Pago',
};

// ─── Genéricos ──────────────────────────────────────────────
export const ACTIVE_INACTIVE_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  inactive: 'Inactivo',
  discontinued: 'Discontinuado',
  archived: 'Archivado',
};

export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  on_hold: 'En revisión',
  blocked: 'Bloqueado',
  inactive: 'Inactivo',
  archived: 'Archivado',
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  entry: 'Ingreso',
  exit: 'Egreso',
  adjustment: 'Ajuste',
  transfer: 'Transferencia',
};

export const BANK_STATEMENT_LINE_KIND_LABELS: Record<string, string> = {
  credit: 'Crédito',
  debit: 'Débito',
};

export const AUDIT_RESULT_LABELS: Record<string, string> = {
  success: 'Exitoso',
  failure: 'Fallido',
  error: 'Error',
  denied: 'Denegado',
  blocked: 'Bloqueado',
};

// ─── Auth ────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  roleId: string;
  permissions: string[];
}

// ─── Users & Roles ───────────────────────────────────────────

export type UserStatus = "active" | "inactive" | "suspended";

export interface User extends BaseFields {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  roleId: string;
  role?: Role;
  lastLoginAt: string | null;
}

export interface Role extends BaseFields {
  name: string;
  description: string | null;
  isSystemRole: boolean;
  isDefault: boolean;
  rolePermissions?: RolePermission[];
}

export interface RolePermission extends BaseFields {
  roleId: string;
  permissionId: string;
  permission?: Permission;
}

export interface Permission extends BaseFields {
  name: string;
  description: string | null;
  section: string | null;
}

// ─── Company & Organization ──────────────────────────────────

export interface Company extends BaseFields {
  razon_social: string;
  nombre_comercial: string;
  moneda_base: string;
  pais: string;
  tax_ids: Record<string, unknown> | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  timezone: string;
  is_active: boolean;
}

export type BranchStatus = "active" | "inactive";

export interface Branch extends BaseFields {
  company_id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  status: BranchStatus;
}

export type WarehouseType = "physical" | "virtual";
export type WarehouseStatus = "active" | "inactive";

export interface Warehouse extends BaseFields {
  branchId: string;
  name: string;
  type: WarehouseType;
  status: WarehouseStatus;
}

// ─── Master Data ─────────────────────────────────────────────

export interface Category extends BaseFields {
  name: string;
  parentId: string | null;
  parent?: Category;
  children?: Category[];
  status: string;
}

export interface Brand extends BaseFields {
  name: string;
  status: string;
}

export interface Unit extends BaseFields {
  name: string;
  abbreviation: string;
  type: string;
}

export interface Tax extends BaseFields {
  name: string;
  rate: number;
  isDefault: boolean;
  status: string;
}

export interface InvoiceType extends BaseFields {
  name: string;
  code: string;
  description: string | null;
}

export interface PaymentCondition extends BaseFields {
  name: string;
  days: number;
  description: string | null;
}

export interface PriceList extends BaseFields {
  name: string;
  currency: string;
  validFrom: string | null;
  validUntil: string | null;
  status: string;
  isDefault: boolean;
  items?: PriceListItem[];
}

export interface PriceListItem extends BaseFields {
  priceListId: string;
  productId: string;
  price: number;
  minQuantity: number;
}

// ─── Customers ───────────────────────────────────────────────

export type CustomerType = "company" | "individual";
export type CustomerStatus = "draft" | "active" | "on_hold" | "blocked" | "inactive" | "archived";
export type CustomerCategory = "A" | "B" | "C";
export type CreditPolicy = "normal" | "strict" | "blocked";

export interface Customer extends BaseFields {
  customerType: CustomerType;
  legalName: string;
  commercialName: string | null;
  taxId: string | null;
  taxCondition: string | null;
  channel: string | null;
  assignedSellerId: string | null;
  priceListId: string | null;
  creditLimit: number;
  status: CustomerStatus;
  phone: string | null;
  email: string | null;
  category: CustomerCategory | null;
  zoneId: string | null;
  routeId: string | null;
  creditPolicy: CreditPolicy;
  blockOnOverdue: boolean;
  overdueDaysThreshold: number;
  contacts?: Contact[];
  addresses?: Address[];
  zoneName?: string;
  routeName?: string;
}

export interface Contact extends BaseFields {
  customerId: string;
  name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

export type AddressType = "shipping" | "billing" | "admin";

export interface Address extends BaseFields {
  customerId: string;
  type: AddressType;
  street: string;
  city: string | null;
  province: string | null;
  country: string | null;
  postalCode: string | null;
  notes: string | null;
}

// ─── Products ────────────────────────────────────────────────

export type ProductStatus = "draft" | "active" | "inactive" | "discontinued";

export interface Product extends BaseFields {
  sku: string | null;
  name: string;
  description: string | null;
  categoryId: string | null;
  brandId: string | null;
  unitId: string | null;
  productType: string;
  basePrice: number;
  baseCost: number;
  controlsStock: boolean;
  minStock: number;
  status: ProductStatus;
  // Fase 2 — Trazabilidad y reposición
  tracksLot: boolean;
  tracksSerial: boolean;
  shelfLifeDays: number | null;
  reorderPoint: number;
  leadTimeDays: number;
  preferredSupplierId: string | null;
  variants?: ProductVariant[];
  categoryName?: string;
  brandName?: string;
  unitName?: string;
  unitAbbreviation?: string;
  preferredSupplierName?: string;
}

export interface ProductVariant extends BaseFields {
  productId: string;
  code: string;
  attributes: Record<string, unknown> | null;
  price: number | null;
  cost: number | null;
  status: string;
}

// ─── Inventory ───────────────────────────────────────────────

export interface Stock extends BaseFields {
  productId: string;
  variantId: string | null;
  warehouseId: string;
  availableQty: number;
  reservedQty: number;
  inTransitQty: number;
  minStock: number;
  productName?: string;
  productSku?: string;
  warehouseName?: string;
}

export type MovementType = "entry" | "exit" | "adjustment" | "transfer";

export interface StockMovement extends BaseFields {
  type: string;
  date: string;
  productId: string;
  variantId: string | null;
  sourceWarehouseId: string | null;
  destWarehouseId: string | null;
  quantity: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  userId: string | null;
  // Fase 2
  lotId: string | null;
  sourceLocationId: string | null;
  destLocationId: string | null;
  reasonCode: string | null;
  productName?: string;
  lotCode?: string;
}

export interface StockReservation extends BaseFields {
  orderId: string;
  productId: string;
  variantId: string | null;
  warehouseId: string;
  quantity: number;
  status: string;
  lotId: string | null;
  locationId: string | null;
  pickingTaskItemId: string | null;
}

// Fase 2 — Lotes y ubicaciones

export type LotStatus = "active" | "blocked" | "expired" | "consumed";

export interface Lot extends BaseFields {
  productId: string;
  code: string;
  manufactureDate: string | null;
  expirationDate: string | null;
  supplierId: string | null;
  receivedAt: string | null;
  status: LotStatus;
  productName?: string;
  productSku?: string;
  supplierName?: string;
}

export interface StockByLot extends BaseFields {
  productId: string;
  lotId: string;
  warehouseId: string;
  locationId: string | null;
  qty: number;
  productName?: string;
  lotCode?: string;
  warehouseName?: string;
  locationCode?: string;
}

export type LocationKind = "pick" | "bulk" | "quarantine" | "returns" | "staging";
export type LocationStatus = "active" | "inactive";

export interface WarehouseLocation extends BaseFields {
  warehouseId: string;
  code: string;
  aisle: string | null;
  rack: string | null;
  shelf: string | null;
  bin: string | null;
  kind: LocationKind;
  status: LocationStatus;
  warehouseName?: string;
}

// ─── Orders ──────────────────────────────────────────────────

export type OrderStatus =
  | "draft"
  | "pending_confirmation"
  | "confirmed"
  | "rejected"
  | "stock_reserved"
  | "in_preparation"
  | "ready_to_dispatch"
  | "dispatched"
  | "delivered"
  | "completed"
  | "cancelled";

export type OperationType = "sale" | "sample" | "donation" | "internal";

export interface Order extends BaseFields {
  number: number;
  customerId: string;
  branchId: string | null;
  sellerId: string | null;
  channel: string | null;
  status: OrderStatus;
  estimatedDeliveryDate: string | null;
  subtotal: number;
  taxes: number;
  discounts: number;
  total: number;
  notes: string | null;
  zoneId: string | null;
  routeId: string | null;
  operationType: OperationType;
  promotionId: string | null;
  pickingStatus: string | null;
  shipmentId: string | null;
  items?: OrderItem[];
  customerName?: string;
  sellerName?: string;
  branchName?: string;
  itemCount?: number;
  zoneName?: string;
  routeName?: string;
}

export interface OrderItem extends BaseFields {
  orderId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  subtotal: number;
  productName?: string;
}

// ─── Suppliers ───────────────────────────────────────────────

export interface Supplier extends BaseFields {
  name: string;
  taxId: string | null;
  primaryContact: string | null;
  phone: string | null;
  email: string | null;
  paymentCondition: string | null;
  status: string;
}

// ─── Purchases ───────────────────────────────────────────────

export type PurchaseOrderStatus =
  | "draft"
  | "requested"
  | "approved"
  | "sent"
  | "partially_received"
  | "received"
  | "cancelled";

export interface PurchaseOrder extends BaseFields {
  supplierId: string;
  branchId: string | null;
  date: string;
  status: PurchaseOrderStatus;
  subtotal: number;
  taxes: number;
  total: number;
  notes: string | null;
  items?: PurchaseOrderItem[];
  supplierName?: string;
}

export interface PurchaseOrderItem extends BaseFields {
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
  productName?: string | null;
  productStatus?: string | null;
  productAvailable?: boolean;
}

export interface PurchaseReception extends BaseFields {
  purchaseOrderId: string;
  date: string;
  warehouseId: string;
  status: string;
  notes: string | null;
}

// ─── Accounts ────────────────────────────────────────────────

export interface Account extends BaseFields {
  entityType: string;
  entityId: string;
  currentBalance: number;
  overdueBalance: number;
  creditLimit: number;
  entries?: AccountEntry[];
  customerName?: string;
  channel?: string;
  taxCondition?: string;
}

export type AccountEntryStatus = "pending" | "partially_settled" | "settled" | "overdue";

export interface AccountEntry extends BaseFields {
  accountId: string;
  date: string;
  type: string;
  concept: string;
  referenceType: string | null;
  referenceId: string | null;
  amount: number;
  resultingBalance: number;
  status: AccountEntryStatus;
}

// ─── Payments ────────────────────────────────────────────────

export type PaymentStatus = "draft" | "pending" | "registered" | "applied" | "reconciled" | "cancelled";

export interface Payment extends BaseFields {
  type: string;
  date: string;
  customerId: string | null;
  supplierId: string | null;
  paymentMethod: string;
  amount: number;
  currency: string;
  externalReference: string | null;
  status: PaymentStatus;
  notes: string | null;
  customerName?: string;
}

// ─── Invoices ────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "pending_issue" | "issued" | "cancelled" | "voided";

export interface Invoice extends BaseFields {
  orderId: string | null;
  typeId: string | null;
  number: string | null;
  issueDate: string | null;
  customerId: string;
  subtotal: number;
  taxes: number;
  total: number;
  status: InvoiceStatus;
  fiscalIntegrationStatus: string | null;
  notes: string | null;
  // Fase 5 — Fiscal AR
  cae: string | null;
  caeExpiration: string | null;
  salesPoint: string | null;
  invoiceType: string | null;
  jurisdictionId: string | null;
  originalInvoiceId: string | null;
  deliveryNoteId: string | null;
  shipmentStopId: string | null;
  customerName?: string;
  orderNumber?: number;
}

// ─── Cashbox ─────────────────────────────────────────────────

export type CashboxStatus = "open" | "closed";

export interface Cashbox extends BaseFields {
  branchId: string;
  name: string;
  status: CashboxStatus;
  sessions?: CashboxSession[];
}

export interface CashboxSession extends BaseFields {
  cashboxId: string;
  openedBy: string;
  openedAt: string;
  closedBy: string | null;
  closedAt: string | null;
  openingBalance: number;
  closingBalance: number | null;
  expectedBalance: number | null;
  difference: number | null;
  notes: string | null;
  // Enriched fields returned by GET /cashbox/sessions
  cashboxName?: string | null;
  openedByName?: string | null;
  closedByName?: string | null;
}

// ─── Integrations ────────────────────────────────────────────

export type IntegrationStatus = "inactive" | "active" | "syncing" | "degraded" | "failed" | "paused";

export interface Integration extends BaseFields {
  provider: string;
  type: string;
  status: IntegrationStatus;
  credentialsRef: string | null;
  configuration: Record<string, unknown> | null;
  lastSyncAt: string | null;
  events?: IntegrationEvent[];
}

export interface IntegrationEvent extends BaseFields {
  integrationId: string;
  eventType: string;
  externalReference: string | null;
  internalReference: string | null;
  status: string;
  detail: Record<string, unknown> | null;
}

// ─── Payment Methods ────────────────────────────────────────

export interface PaymentMethod extends BaseFields {
  name: string;
  code: string;
  status: string;
  description: string | null;
}

// ─── Report Interfaces ──────────────────────────────────────

export interface CriticalStockItem {
  productId: string;
  warehouseId: string;
  availableQty: number;
  minStock: number;
  productName?: string;
  productSku?: string;
}

export interface CustomerDebtItem {
  customerId: string;
  balance: number;
  overdueBalance: number;
  customerName?: string;
}

export interface TopProductItem {
  productId: string;
  totalQty: number;
  totalRevenue: number;
  productName?: string;
  productSku?: string;
}

export interface TopCustomerItem {
  customerId: string;
  totalOrders: number;
  totalRevenue: number;
  customerName?: string;
}

export interface SalesByPeriodItem {
  date: string;
  count: number;
  total: number;
}

export interface OrdersByStatusItem {
  status: string;
  count: number;
}

// ─── Comercial (Fase 1) ──────────────────────────────────────

export type SalesZoneStatus = "active" | "inactive";

export interface SalesZone extends BaseFields {
  code: string;
  name: string;
  parentZoneId: string | null;
  status: SalesZoneStatus;
  parentZoneName?: string;
}

export type RouteFrequency = "daily" | "weekly" | "biweekly" | "monthly" | "custom";
export type VisitWindow = "morning" | "afternoon" | "all_day";

export interface Route extends BaseFields {
  code: string;
  name: string;
  zoneId: string | null;
  defaultSellerId: string | null;
  defaultDriverId: string | null;
  frequency: RouteFrequency;
  weekdays: number[] | null;
  status: string;
  zoneName?: string;
  defaultSellerName?: string;
  defaultDriverName?: string;
  visits?: RouteVisit[];
}

export interface RouteVisit extends BaseFields {
  routeId: string;
  customerId: string;
  sequence: number;
  visitWindow: VisitWindow | null;
  customerName?: string;
}

export type VisitResult = "ordered" | "no_order" | "closed" | "absent";

export interface CustomerVisit extends BaseFields {
  customerId: string;
  routeId: string | null;
  sellerId: string | null;
  visitedAt: string;
  result: VisitResult;
  orderId: string | null;
  notes: string | null;
  lat: number | null;
  lng: number | null;
  customerName?: string;
  routeName?: string;
  sellerName?: string;
}

export type PromotionKind =
  | "discount_pct"
  | "discount_amount"
  | "nx+m"
  | "combo"
  | "price_override";

export type PromotionStatus = "draft" | "active" | "expired" | "cancelled";

export interface Promotion extends BaseFields {
  code: string;
  name: string;
  kind: PromotionKind;
  validFrom: string | null;
  validTo: string | null;
  channel: string | null;
  customerCategory: CustomerCategory | null;
  zoneId: string | null;
  priority: number;
  status: PromotionStatus;
  items?: PromotionItem[];
  zoneName?: string;
}

export interface PromotionItem extends BaseFields {
  promotionId: string;
  productId: string | null;
  categoryId: string | null;
  discountPct: number | null;
  discountAmount: number | null;
  buyQty: number | null;
  getQty: number | null;
  overridePrice: number | null;
  productName?: string;
  categoryName?: string;
}

export type CommissionStatus = "accrued" | "approved" | "paid" | "reversed";

export interface Commission extends BaseFields {
  sellerId: string;
  orderId: string | null;
  invoiceId: string | null;
  baseAmount: number;
  rate: number;
  amount: number;
  status: CommissionStatus;
  paymentId: string | null;
  sellerName?: string;
  orderNumber?: number;
}

// ─── Fase 3 — Logística ──────────────────────────────────────

export type PickingStatus =
  | "pending"
  | "assigned"
  | "in_progress"
  | "picked"
  | "staged"
  | "cancelled";

export type PickingItemStatus = "pending" | "picked" | "short" | "skipped";

export interface PickingTask extends BaseFields {
  orderId: string;
  shipmentId: string | null;
  warehouseId: string;
  assignedTo: string | null;
  status: PickingStatus;
  startedAt: string | null;
  completedAt: string | null;
  priority: number;
  items?: PickingTaskItem[];
  orderNumber?: number;
  warehouseName?: string;
  assignedToName?: string;
}

export interface PickingTaskItem extends BaseFields {
  pickingTaskId: string;
  orderItemId: string;
  productId: string;
  lotId: string | null;
  sourceLocationId: string | null;
  requestedQty: number;
  pickedQty: number;
  status: PickingItemStatus;
  productName?: string;
  lotCode?: string;
  locationCode?: string;
}

export type ShipmentStatus =
  | "planned"
  | "loaded"
  | "in_transit"
  | "completed"
  | "cancelled";

export type ShipmentStopStatus =
  | "pending"
  | "arrived"
  | "delivered"
  | "partial"
  | "rejected"
  | "not_visited";

export interface Shipment extends BaseFields {
  warehouseId: string;
  vehicleId: string | null;
  driverId: string | null;
  dispatchSheetId: string | null;
  plannedDate: string;
  departedAt: string | null;
  returnedAt: string | null;
  status: ShipmentStatus;
  totalStops: number;
  totalWeightKg: number;
  stops?: ShipmentStop[];
  vehiclePlate?: string;
  driverName?: string;
  warehouseName?: string;
}

export interface ShipmentStop extends BaseFields {
  shipmentId: string;
  sequence: number;
  orderId: string;
  customerId: string;
  addressId: string | null;
  plannedWindow: string | null;
  arrivedAt: string | null;
  departedAt: string | null;
  status: ShipmentStopStatus;
  deliveryNoteId: string | null;
  signatureUrl: string | null;
  notes: string | null;
  lat: number | null;
  lng: number | null;
  customerName?: string;
  orderNumber?: number;
}

export type VehicleStatus = "active" | "maintenance" | "retired";

export interface Vehicle extends BaseFields {
  plate: string;
  model: string | null;
  capacityKg: number | null;
  capacityM3: number | null;
  status: VehicleStatus;
}

export type DriverStatus = "active" | "inactive";

export interface Driver extends BaseFields {
  userId: string | null;
  fullName: string;
  dni: string | null;
  licenseNumber: string | null;
  licenseExpires: string | null;
  phone: string | null;
  status: DriverStatus;
}

export type DispatchSheetStatus = "draft" | "printed" | "dispatched" | "closed";

export interface DispatchSheet extends BaseFields {
  date: string;
  vehicleId: string | null;
  driverId: string | null;
  warehouseId: string | null;
  status: DispatchSheetStatus;
  notes: string | null;
  vehiclePlate?: string;
  driverName?: string;
  warehouseName?: string;
}

export interface DispatchSheetPrintData {
  sheet: {
    id: string;
    number: number;
    date: string;
    status: DispatchSheetStatus;
    notes: string | null;
    vehicle: {
      id: string;
      plate: string;
      model: string | null;
      capacityKg: string | number | null;
      capacityM3: string | number | null;
    } | null;
    driver: {
      id: string;
      fullName: string;
      dni: string | null;
      phone: string | null;
      licenseNumber: string | null;
    } | null;
    warehouse: {
      id: string;
      name: string;
      branchId: string | null;
    } | null;
  };
  shipments: {
    id: string;
    number: number;
    plannedDate: string;
    status: string;
    totalStops: number;
    totalWeightKg: string | number | null;
    stops: {
      id: string;
      sequence: number;
      status: string;
      plannedWindow: string | null;
      notes: string | null;
      customer: {
        id: string;
        legalName: string;
        commercialName: string | null;
        taxId: string | null;
        phone: string | null;
      } | null;
      address: {
        id: string;
        street: string;
        city: string | null;
        province: string | null;
        postalCode: string | null;
        notes: string | null;
      } | null;
      order: {
        id: string;
        number: number;
        status: string;
        total: string | number;
        notes: string | null;
        estimatedDeliveryDate: string | null;
      } | null;
      deliveryNote: {
        id: string;
        number: string;
        salesPoint: string | null;
        issueDate: string;
        status: string;
      } | null;
    }[];
  }[];
  totals: {
    stops: number;
    orders: number;
    documentedTotal: number;
    totalWeightKg: number;
  };
}

export type ReturnKind =
  | "not_delivered"
  | "rejected_by_customer"
  | "damaged"
  | "expired"
  | "commercial";

export type ReturnStatus =
  | "draft"
  | "confirmed"
  | "received"
  | "inspected"
  | "closed"
  | "cancelled";

export type ReturnCondition = "resellable" | "damaged" | "expired" | "quarantine";

export interface ReturnOrder extends BaseFields {
  customerId: string;
  shipmentId: string | null;
  shipmentStopId: string | null;
  originalOrderId: string | null;
  kind: ReturnKind;
  status: ReturnStatus;
  warehouseId: string | null;
  notes: string | null;
  items?: ReturnOrderItem[];
  customerName?: string;
  originalOrderNumber?: number;
}

export interface ReturnOrderItem extends BaseFields {
  returnOrderId: string;
  productId: string;
  lotId: string | null;
  quantity: number;
  reasonCode: string | null;
  condition: ReturnCondition;
  destLocationId: string | null;
  creditNoteId: string | null;
  productName?: string;
  lotCode?: string;
}

export type InventoryCountKind = "cycle" | "full" | "spot";
export type InventoryCountStatus =
  | "draft"
  | "in_progress"
  | "pending_approval"
  | "approved"
  | "applied"
  | "cancelled";

export interface InventoryCount extends BaseFields {
  warehouseId: string;
  kind: InventoryCountKind;
  scope: Record<string, unknown> | null;
  status: InventoryCountStatus;
  approvedBy: string | null;
  notes: string | null;
  lines?: InventoryCountLine[];
  warehouseName?: string;
}

export interface InventoryCountLine extends BaseFields {
  inventoryCountId: string;
  productId: string;
  lotId: string | null;
  locationId: string | null;
  systemQty: number;
  countedQty: number;
  difference: number;
  reasonCode: string | null;
  productName?: string;
  lotCode?: string;
  locationCode?: string;
}

// ─── Fase 4 — Compras avanzadas ──────────────────────────────

export type SupplierInvoiceStatus =
  | "draft" | "pending_approval" | "matched" | "approved" | "paid" | "cancelled" | "disputed";

export type SupplierInvoiceType = "A" | "B" | "C" | "E";

export interface SupplierInvoice extends BaseFields {
  supplierId: string;
  invoiceType: SupplierInvoiceType;
  supplierInvoiceNumber: string;
  salesPoint: string | null;
  issueDate: string;
  receptionDate: string | null;
  dueDate: string | null;
  currency: string;
  subtotal: number;
  taxes: number;
  perceptions: number;
  total: number;
  status: SupplierInvoiceStatus;
  cae: string | null;
  caeExpiration: string | null;
  purchaseOrderId: string | null;
  notes: string | null;
  items?: SupplierInvoiceItem[];
  supplierName?: string;
}

export interface SupplierInvoiceItem extends BaseFields {
  supplierInvoiceId: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitCost: number;
  discount: number;
  tax: number;
  subtotal: number;
  purchaseOrderItemId: string | null;
  receptionItemId: string | null;
  productName?: string;
}

export type SupplierDeliveryNoteStatus = "pending" | "received" | "closed";

export interface SupplierDeliveryNote extends BaseFields {
  supplierId: string;
  supplierDeliveryNoteNumber: string;
  purchaseOrderId: string | null;
  warehouseId: string;
  status: SupplierDeliveryNoteStatus;
  supplierName?: string;
  warehouseName?: string;
}

export type ThreeWayStatus = "pending" | "matched" | "discrepancy" | "overridden";

export interface ThreeWayMatch extends BaseFields {
  purchaseOrderId: string;
  supplierDeliveryNoteId: string | null;
  supplierInvoiceId: string | null;
  status: ThreeWayStatus;
  discrepancies: Record<string, unknown> | null;
  overrideReason: string | null;
}

export type SupplierClaimKind =
  | "short_qty" | "damaged" | "wrong_sku" | "overpricing" | "missing_cae";

export type SupplierClaimStatus =
  | "draft" | "sent" | "acknowledged" | "credit_received" | "resolved" | "rejected";

export interface SupplierClaim extends BaseFields {
  supplierId: string;
  supplierInvoiceId: string | null;
  purchaseOrderId: string | null;
  kind: SupplierClaimKind;
  status: SupplierClaimStatus;
  amount: number | null;
  notes: string | null;
  supplierName?: string;
}

// ─── Fase 5 — Fiscal AR ──────────────────────────────────────

export type JurisdictionKind = "national" | "provincial" | "municipal";

export interface Jurisdiction extends BaseFields {
  code: string;
  name: string;
  kind: JurisdictionKind;
  parentJurisdictionId: string | null;
}

export interface CustomerJurisdiction extends BaseFields {
  customerId: string;
  jurisdictionId: string;
  condition: string;
  inscriptionNumber: string | null;
  jurisdictionName?: string;
  jurisdictionCode?: string;
}

export type DeliveryNoteStatus = "draft" | "issued" | "invoiced" | "cancelled";

export interface DeliveryNote extends BaseFields {
  number: string;
  salesPoint: string | null;
  issueDate: string | null;
  customerId: string;
  orderId: string | null;
  shipmentStopId: string | null;
  warehouseId: string | null;
  driverId: string | null;
  vehicleId: string | null;
  status: DeliveryNoteStatus;
  invoiceId: string | null;
  cae: string | null;
  caeExpiration: string | null;
  customerName?: string;
  items?: Array<{
    id: string;
    productId: string;
    lotId: string | null;
    quantity: number;
    unitPrice: number;
    productName?: string;
  }>;
}

export type CreditNoteStatus =
  | "draft" | "pending_issue" | "issued" | "applied" | "voided";

export interface CreditNote extends BaseFields {
  number: string | null;
  salesPoint: string | null;
  issueDate: string | null;
  customerId: string;
  originalInvoiceId: string | null;
  reason: string | null;
  subtotal: number;
  taxes: number;
  total: number;
  status: CreditNoteStatus;
  cae: string | null;
  caeExpiration: string | null;
  customerName?: string;
}

export interface DebitNote extends BaseFields {
  number: string | null;
  salesPoint: string | null;
  issueDate: string | null;
  customerId: string;
  originalInvoiceId: string | null;
  reason: string | null;
  subtotal: number;
  taxes: number;
  total: number;
  status: CreditNoteStatus;
  cae: string | null;
  caeExpiration: string | null;
  customerName?: string;
}

export type FiscalAuthStatus = "pending" | "approved" | "rejected" | "expired";

export interface FiscalAuthorization extends BaseFields {
  documentType: string;
  documentId: string;
  provider: string;
  cae: string | null;
  caeExpiration: string | null;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  status: FiscalAuthStatus;
}

// ─── Fase 6 — Tesorería ──────────────────────────────────────

export type CheckStatus =
  | "received" | "in_portfolio" | "deposited" | "cleared"
  | "bounced" | "endorsed" | "returned_to_customer" | "cancelled";

export type CheckKind = "common" | "deferred";

export interface Check extends BaseFields {
  number: string;
  bankName: string | null;
  accountHolder: string | null;
  cuit: string | null;
  amount: number;
  issueDate: string | null;
  dueDate: string | null;
  kind: CheckKind;
  ownOrThird: string;
  receivedFromCustomerId: string | null;
  endorsedToSupplierId: string | null;
  bankAccountId: string | null;
  status: CheckStatus;
  bounceReason: string | null;
  customerName?: string;
  supplierName?: string;
  bankAccountName?: string;
}

export interface BankAccount extends BaseFields {
  name: string;
  bankName: string | null;
  cbu: string | null;
  alias: string | null;
  currency: string;
  accountNumber: string | null;
  status: string;
}

export type RenditionStatus = "draft" | "submitted" | "approved" | "rejected";

export interface CollectorRendition extends BaseFields {
  collectorId: string;
  shipmentId: string | null;
  date: string;
  status: RenditionStatus;
  totalCash: number;
  totalChecks: number;
  totalTransfers: number;
  total: number;
  lines?: CollectorRenditionLine[];
  collectorName?: string | null;
}

export interface CollectorRenditionLine extends BaseFields {
  collectorRenditionId: string;
  paymentId: string;
  declaredAmount: number;
  acceptedAmount: number;
  difference: number;
}

export interface BankStatement extends BaseFields {
  bankAccountId: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  source: string;
  status: string;
  lines?: BankStatementLine[];
  bankAccountName?: string;
}

export interface BankStatementLine extends BaseFields {
  bankStatementId: string;
  date: string;
  description: string | null;
  amount: number;
  kind: "credit" | "debit";
  matched: boolean;
  reconciliationMatchId: string | null;
}

export interface ReconciliationMatch extends BaseFields {
  bankStatementLineId: string;
  paymentId: string | null;
  checkId: string | null;
  amount: number;
  status: "proposed" | "confirmed" | "rejected";
}

export type WithholdingKind = "iibb" | "ganancias" | "iva" | "suss";
export type WithholdingDirection = "suffered" | "applied";

export interface Withholding extends BaseFields {
  kind: WithholdingKind;
  direction: WithholdingDirection;
  jurisdictionId: string | null;
  taxId: string | null;
  customerId: string | null;
  supplierId: string | null;
  paymentId: string | null;
  invoiceId: string | null;
  supplierInvoiceId: string | null;
  amount: number;
  certificateNumber: string | null;
  jurisdictionName?: string;
  customerName?: string;
  supplierName?: string;
}

export interface WithholdingPadron extends BaseFields {
  kind: WithholdingKind;
  jurisdictionId: string;
  cuit: string;
  ratePerception: number | null;
  rateWithholding: number | null;
  validFrom: string;
  validTo: string | null;
  source: string | null;
}

export type PaymentOrderStatus = "draft" | "approved" | "paid" | "cancelled";

export interface PaymentOrder extends BaseFields {
  supplierId: string;
  date: string;
  total: number;
  status: PaymentOrderStatus;
  paymentBatchId: string | null;
  supplierName?: string;
}

export type PaymentBatchStatus = "draft" | "file_generated" | "processed" | "failed";

export interface PaymentBatch extends BaseFields {
  bankAccountId: string;
  date: string;
  status: PaymentBatchStatus;
  total: number;
  fileUrl: string | null;
  bankAccountName?: string;
}

// ─── Audit ───────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
  actor_type: "user" | "system" | "agent";
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  ip_address: string | null;
  result: string;
  entityLabel?: string;
}

// ─── Soporte ────────────────────────────────────────────────

export type SupportTicketStatus = "created" | "in_progress" | "review" | "resolved";
export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";
export type SupportTicketType = "bug" | "question" | "change";
export type SupportTicketAgentState =
  | "idle"
  | "ai_working"
  | "waiting_customer"
  | "awaiting_review"
  | "human_handoff"
  | "resolved"
  | "failed";

export type SupportMessageSenderRole = "customer" | "support" | "system";
export type SupportMessageSenderKind = "user" | "ai" | "system";

export const SUPPORT_TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  created: "Creado",
  in_progress: "En progreso",
  review: "En revisión",
  resolved: "Resuelto",
};

export const SUPPORT_TICKET_PRIORITY_LABELS: Record<SupportTicketPriority, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

export const SUPPORT_TICKET_TYPE_LABELS: Record<SupportTicketType, string> = {
  bug: "Bug",
  question: "Duda",
  change: "Cambio",
};

export interface SupportTicketAttachment extends BaseFields {
  ticketId: string;
  messageId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number | string;
  storageKey: string;
  uploadedByUserId: string;
}

export interface SupportTicketMessage extends BaseFields {
  ticketId: string;
  senderRole: SupportMessageSenderRole;
  senderKind: SupportMessageSenderKind;
  senderUserId: string | null;
  body: string | null;
  status: "sent" | "failed";
}

export interface SupportTicket extends BaseFields {
  ticketNumber?: number;
  title: string;
  description: string;
  type: SupportTicketType;
  priority: SupportTicketPriority;
  appEnv: string | null;
  status: SupportTicketStatus;
  agentState: SupportTicketAgentState;
  createdByUserId: string;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  lastActivityAt: string;
  messages?: SupportTicketMessage[];
  attachments?: SupportTicketAttachment[];
}

export interface SupportTicketsSummary {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface SupportAgentStatus {
  enabled: boolean;
  configured: boolean;
  missing: string[];
  baseUrlConfigured: boolean;
  model: string;
}
