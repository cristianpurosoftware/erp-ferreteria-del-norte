/**
 * Prefix registry for prefix_nanoid IDs. BaseEntity emits IDs as
 * `<prefix>_<nanoid12>` (e.g. `cust_abc123def456`).
 *
 * Lookup order at runtime:
 *   1. Class name → explicit override in this file (preferred for clarity).
 *   2. Fallback: first 4 chars of the class name without the "Entity" suffix,
 *      lowercased. So `WidgetEntity` → `widg`, `RoleEntity` → `role`.
 *
 * Add an entry here when:
 *   - The auto-derived prefix collides with another entity (e.g. two entities
 *     starting with the same 4 letters).
 *   - The 4-char truncation looks ugly (`orde`, `invo`, `paym`, `stoc`).
 *   - The prefix is referenced in user-facing places (URLs, logs) and you want
 *     a stable, hand-picked short form.
 */
export const ID_PREFIXES_BY_CLASS: Record<string, string> = {
  // Core retail nouns — picked for legibility in URLs/logs
  CustomerEntity: 'cust',
  ProductEntity: 'prod',
  ProductVariantEntity: 'pvar',
  OrderEntity: 'ord',
  OrderItemEntity: 'oitm',
  InvoiceEntity: 'inv',
  InvoiceItemEntity: 'iitm',
  PaymentEntity: 'pay',
  PaymentItemEntity: 'pitm',
  CheckEntity: 'chk',
  AccountEntity: 'acc',
  AccountMovementEntity: 'amov',
  WarehouseEntity: 'whs',
  StockEntity: 'stk',
  StockMovementEntity: 'mov',
  StockReservationEntity: 'rsv',
  CategoryEntity: 'cat',
  BrandEntity: 'brn',
  SupplierEntity: 'sup',
  UserEntity: 'usr',
  RoleEntity: 'rol',
  PermissionEntity: 'perm',
  UnitEntity: 'unt',
  PriceListEntity: 'plst',
  PriceListItemEntity: 'plit',
  CashboxEntity: 'cbx',
  CashboxSessionEntity: 'cses',
  CompanyEntity: 'co',
  BranchEntity: 'br',
  TaxEntity: 'tax',
  InvoiceTypeEntity: 'itype',
  PaymentMethodEntity: 'pm',
  PaymentConditionEntity: 'pcond',
  CreditNoteEntity: 'cnote',
  DebitNoteEntity: 'dnote',
  DeliveryNoteEntity: 'remito',
  DispatchSheetEntity: 'hr',
  DriverEntity: 'drv',
  VehicleEntity: 'veh',
  PurchaseOrderEntity: 'oc',
  PurchaseReceptionEntity: 'recep',
  SupplierInvoiceEntity: 'sinv',
  SupplierDeliveryNoteEntity: 'sdn',
  SupplierClaimEntity: 'sclaim',
  PromotionEntity: 'promo',
  CommissionEntity: 'comm',
  ShipmentEntity: 'ship',
  PickingEntity: 'pick',
  RouteEntity: 'rt',
  SalesZoneEntity: 'zone',
  WarehouseLocationEntity: 'wloc',
  LotEntity: 'lot',
  InventoryCountEntity: 'icnt',
  ReturnEntity: 'ret',
  PaymentOrderEntity: 'po',
  CollectorRenditionEntity: 'rend',
  BankAccountEntity: 'bk',
  BankStatementEntity: 'bks',
  BankStatementMovementEntity: 'bksm',
  ReconciliationEntity: 'recon',
  WithholdingEntity: 'with',
  JurisdictionEntity: 'jur',
  FiscalAuthorizationEntity: 'cae',
  IntegrationEntity: 'int',
  AuditEntryEntity: 'aud',
  SupportTicketEntity: 'tkt',
  SupportTicketMessageEntity: 'tmsg',
  SupportTicketAttachmentEntity: 'tatt',
  // POS module (added in this demo iteration)
  PosSaleEntity: 'sale',
};

const FALLBACK_LENGTH = 4;

/**
 * Resolve the prefix for a TypeORM entity class name.
 * If no explicit mapping exists, derive `<lowercased name without Entity, truncated to 4>`.
 */
export function resolveIdPrefix(className: string): string {
  const explicit = ID_PREFIXES_BY_CLASS[className];
  if (explicit) return explicit;
  const stripped = className.replace(/Entity$/, '').toLowerCase();
  return stripped.slice(0, FALLBACK_LENGTH) || 'gen';
}
