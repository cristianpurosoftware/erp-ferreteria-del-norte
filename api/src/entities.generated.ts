// AUTO-GENERATED. Edits to this file will be lost next time scripts/gen-entities.mjs runs.
// Static imports of every module entity so TypeORM does not need a glob-require at runtime.
// Regenerate with: npm run gen:entities

import { AccountEntryEntity } from './modules/accounts/data_access/account-entry.entity';
import { AccountEntity } from './modules/accounts/data_access/account.entity';
import { AuditEventEntity } from './modules/audit/data_access/audit-event.entity';
import { BankAccountEntity } from './modules/bank-accounts/data_access/bank-account.entity';
import { BankStatementLineEntity } from './modules/bank-statements/data_access/bank-statement-line.entity';
import { BankStatementEntity } from './modules/bank-statements/data_access/bank-statement.entity';
import { BranchEntity } from './modules/branches/data_access/branch.entity';
import { BrandEntity } from './modules/brands/data_access/brand.entity';
import { CashboxSessionEntity } from './modules/cashbox/data_access/cashbox-session.entity';
import { CashboxEntity } from './modules/cashbox/data_access/cashbox.entity';
import { CategoryEntity } from './modules/categories/data_access/category.entity';
import { CheckEntity } from './modules/checks/data_access/check.entity';
import { CollectorRenditionLineEntity } from './modules/collector-renditions/data_access/collector-rendition-line.entity';
import { CollectorRenditionEntity } from './modules/collector-renditions/data_access/collector-rendition.entity';
import { CommissionEntity } from './modules/commissions/data_access/commission.entity';
import { CompanyEntity } from './modules/company/data_access/company.entity';
import { CreditNoteItemEntity } from './modules/credit-notes/data_access/credit-note-item.entity';
import { CreditNoteEntity } from './modules/credit-notes/data_access/credit-note.entity';
import { AddressEntity } from './modules/customers/data_access/address.entity';
import { ContactEntity } from './modules/customers/data_access/contact.entity';
import { CustomerEntity } from './modules/customers/data_access/customer.entity';
import { DebitNoteItemEntity } from './modules/debit-notes/data_access/debit-note-item.entity';
import { DebitNoteEntity } from './modules/debit-notes/data_access/debit-note.entity';
import { DeliveryNoteItemEntity } from './modules/delivery-notes/data_access/delivery-note-item.entity';
import { DeliveryNoteEntity } from './modules/delivery-notes/data_access/delivery-note.entity';
import { DispatchSheetEntity } from './modules/dispatch-sheets/data_access/dispatch-sheet.entity';
import { DriverEntity } from './modules/drivers/data_access/driver.entity';
import { FiscalAuthorizationEntity } from './modules/fiscal-authorizations/data_access/fiscal-authorization.entity';
import { IntegrationEventEntity } from './modules/integrations/data_access/integration-event.entity';
import { IntegrationEntity } from './modules/integrations/data_access/integration.entity';
import { InventoryCountLineEntity } from './modules/inventory-counts/data_access/inventory-count-line.entity';
import { InventoryCountEntity } from './modules/inventory-counts/data_access/inventory-count.entity';
import { StockMovementEntity } from './modules/inventory/data_access/stock-movement.entity';
import { StockReservationEntity } from './modules/inventory/data_access/stock-reservation.entity';
import { StockEntity } from './modules/inventory/data_access/stock.entity';
import { InvoiceTypeEntity } from './modules/invoice-types/data_access/invoice-type.entity';
import { InvoiceEntity } from './modules/invoices/data_access/invoice.entity';
import { CustomerJurisdictionEntity } from './modules/jurisdictions/data_access/customer-jurisdiction.entity';
import { JurisdictionEntity } from './modules/jurisdictions/data_access/jurisdiction.entity';
import { LotEntity } from './modules/lots/data_access/lot.entity';
import { StockByLotEntity } from './modules/lots/data_access/stock-by-lot.entity';
import { OrderItemEntity } from './modules/orders/data_access/order-item.entity';
import { OrderEntity } from './modules/orders/data_access/order.entity';
import { PaymentConditionEntity } from './modules/payment-conditions/data_access/payment-condition.entity';
import { PosSaleEntity } from './modules/pos/data_access/pos-sale.entity';
import { PaymentMethodEntity } from './modules/payment-methods/data_access/payment-method.entity';
import { PaymentBatchEntity } from './modules/payment-orders/data_access/payment-batch.entity';
import { PaymentOrderEntity } from './modules/payment-orders/data_access/payment-order.entity';
import { PaymentEntity } from './modules/payments/data_access/payment.entity';
import { PermissionEntity } from './modules/permissions/data_access/permission.entity';
import { PickingTaskItemEntity } from './modules/picking/data_access/picking-task-item.entity';
import { PickingTaskEntity } from './modules/picking/data_access/picking-task.entity';
import { PriceListItemEntity } from './modules/price-lists/data_access/price-list-item.entity';
import { PriceListEntity } from './modules/price-lists/data_access/price-list.entity';
import { ProductVariantEntity } from './modules/products/data_access/product-variant.entity';
import { ProductEntity } from './modules/products/data_access/product.entity';
import { PromotionItemEntity } from './modules/promotions/data_access/promotion-item.entity';
import { PromotionEntity } from './modules/promotions/data_access/promotion.entity';
import { PurchaseOrderItemEntity } from './modules/purchases/data_access/purchase-order-item.entity';
import { PurchaseOrderEntity } from './modules/purchases/data_access/purchase-order.entity';
import { PurchaseReceptionEntity } from './modules/purchases/data_access/purchase-reception.entity';
import { ReconciliationMatchEntity } from './modules/reconciliation/data_access/reconciliation-match.entity';
import { ReturnOrderItemEntity } from './modules/returns/data_access/return-order-item.entity';
import { ReturnOrderEntity } from './modules/returns/data_access/return-order.entity';
import { RolePermissionEntity } from './modules/roles/data_access/role-permission.entity';
import { RoleEntity } from './modules/roles/data_access/role.entity';
import { CustomerVisitEntity } from './modules/routes/data_access/customer-visit.entity';
import { RouteVisitEntity } from './modules/routes/data_access/route-visit.entity';
import { RouteEntity } from './modules/routes/data_access/route.entity';
import { SalesZoneEntity } from './modules/sales-zones/data_access/sales-zone.entity';
import { ShipmentStopEntity } from './modules/shipments/data_access/shipment-stop.entity';
import { ShipmentEntity } from './modules/shipments/data_access/shipment.entity';
import { SupplierClaimEntity } from './modules/supplier-claims/data_access/supplier-claim.entity';
import { SupplierDeliveryNoteEntity } from './modules/supplier-delivery-notes/data_access/supplier-delivery-note.entity';
import { SupplierInvoiceItemEntity } from './modules/supplier-invoices/data_access/supplier-invoice-item.entity';
import { SupplierInvoiceEntity } from './modules/supplier-invoices/data_access/supplier-invoice.entity';
import { SupplierEntity } from './modules/suppliers/data_access/supplier.entity';
import { SupportAgentRunEntity } from './modules/support-tickets/data_access/support-agent-run.entity';
import { SupportTicketAttachmentEntity } from './modules/support-tickets/data_access/support-ticket-attachment.entity';
import { SupportTicketEventEntity } from './modules/support-tickets/data_access/support-ticket-event.entity';
import { SupportTicketMessageEntity } from './modules/support-tickets/data_access/support-ticket-message.entity';
import { SupportTicketEntity } from './modules/support-tickets/data_access/support-ticket.entity';
import { TaxEntity } from './modules/taxes/data_access/tax.entity';
import { ThreeWayMatchEntity } from './modules/three-way-match/data_access/three-way-match.entity';
import { UnitEntity } from './modules/units/data_access/unit.entity';
import { UserEntity } from './modules/users/data_access/user.entity';
import { VehicleEntity } from './modules/vehicles/data_access/vehicle.entity';
import { WarehouseLocationEntity } from './modules/warehouse-locations/data_access/warehouse-location.entity';
import { WarehouseEntity } from './modules/warehouses/data_access/warehouse.entity';
import { WithholdingPadronEntity } from './modules/withholdings/data_access/withholding-padron.entity';
import { WithholdingEntity } from './modules/withholdings/data_access/withholding.entity';

export const entityClasses = [
  AccountEntryEntity,
  AccountEntity,
  AuditEventEntity,
  BankAccountEntity,
  BankStatementLineEntity,
  BankStatementEntity,
  BranchEntity,
  BrandEntity,
  CashboxSessionEntity,
  CashboxEntity,
  CategoryEntity,
  CheckEntity,
  CollectorRenditionLineEntity,
  CollectorRenditionEntity,
  CommissionEntity,
  CompanyEntity,
  CreditNoteItemEntity,
  CreditNoteEntity,
  AddressEntity,
  ContactEntity,
  CustomerEntity,
  DebitNoteItemEntity,
  DebitNoteEntity,
  DeliveryNoteItemEntity,
  DeliveryNoteEntity,
  DispatchSheetEntity,
  DriverEntity,
  FiscalAuthorizationEntity,
  IntegrationEventEntity,
  IntegrationEntity,
  InventoryCountLineEntity,
  InventoryCountEntity,
  StockMovementEntity,
  StockReservationEntity,
  StockEntity,
  InvoiceTypeEntity,
  InvoiceEntity,
  CustomerJurisdictionEntity,
  JurisdictionEntity,
  LotEntity,
  StockByLotEntity,
  OrderItemEntity,
  OrderEntity,
  PaymentConditionEntity,
  PaymentMethodEntity,
  PosSaleEntity,
  PaymentBatchEntity,
  PaymentOrderEntity,
  PaymentEntity,
  PermissionEntity,
  PickingTaskItemEntity,
  PickingTaskEntity,
  PriceListItemEntity,
  PriceListEntity,
  ProductVariantEntity,
  ProductEntity,
  PromotionItemEntity,
  PromotionEntity,
  PurchaseOrderItemEntity,
  PurchaseOrderEntity,
  PurchaseReceptionEntity,
  ReconciliationMatchEntity,
  ReturnOrderItemEntity,
  ReturnOrderEntity,
  RolePermissionEntity,
  RoleEntity,
  CustomerVisitEntity,
  RouteVisitEntity,
  RouteEntity,
  SalesZoneEntity,
  ShipmentStopEntity,
  ShipmentEntity,
  SupplierClaimEntity,
  SupplierDeliveryNoteEntity,
  SupplierInvoiceItemEntity,
  SupplierInvoiceEntity,
  SupplierEntity,
  SupportAgentRunEntity,
  SupportTicketAttachmentEntity,
  SupportTicketEventEntity,
  SupportTicketMessageEntity,
  SupportTicketEntity,
  TaxEntity,
  ThreeWayMatchEntity,
  UnitEntity,
  UserEntity,
  VehicleEntity,
  WarehouseLocationEntity,
  WarehouseEntity,
  WithholdingPadronEntity,
  WithholdingEntity,
];
