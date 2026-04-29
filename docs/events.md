# Catálogo de eventos de dominio

Todos los eventos que el backend emite via `eventBus`, agrupados por dominio. Un listener en `api/src/extensions/` puede suscribirse a cualquiera de estos para agregar side-effects sin tocar el módulo original.

> **Cómo se mantiene actualizado:** regenerar con
> `for f in $(find api/src/modules -name "*.events.ts" | sort); do echo "### $f"; cat "$f"; done > /tmp/events-dump.txt`
> y propagar los cambios acá. Alternativa: escribir un script que lea los `*.events.ts` y genere este archivo.

---

## Cómo suscribirse a un evento

```typescript
// api/src/extensions/my-listener.ts
import eventBus from '../common/event-bus';
import { OrderEvents } from '../modules/orders/orders.events';

eventBus.on(OrderEvents.CONFIRMED, async (order) => {
  // side-effect: email al depósito, webhook, sync externo, etc.
});
```

Y registrar el listener importándolo desde `api/src/extensions/index.ts`.

---

## Ventas

### Orders (`order.*`)
`created`, `submitted`, `confirmed`, `rejected`, `stock_reserved`, `preparation_started`, `ready_to_dispatch`, `dispatched`, `delivered`, `completed`, `cancelled`, `blocked_by_credit`

### Delivery Notes (`delivery_note.*`)
`created`, `issued`, `invoiced`, `cancelled`

### Invoices (`invoice.*`)
`created`, `issued`, `accepted`, `rejected`, `voided`, `cancelled`, `cae_requested`, `cae_received`, `cae_rejected`

### Credit Notes (`credit_note.*`)
`created`, `issued`, `applied`, `cancelled`

### Debit Notes (`debit_note.*`)
`created`, `issued`, `cancelled`

### Returns (`return.*`)
`created`, `confirmed`, `received`, `inspected`, `closed`, `cancelled`

### Customers (`customer.*`)
`created`, `updated`, `activated`, `blocked`, `unblocked`, `archived`

### Promotions (`promotion.*`)
`created`, `activated`, `expired`, `cancelled`, `item_added`, `item_removed`

---

## Compras / Proveedores

### Purchases (`purchase.*`)
`created`, `updated`, `approved`, `sent`, `partially_received`, `received`, `reception_completed`, `cancelled`

### Supplier Delivery Notes (`supplier_delivery_note.*`)
`created`, `received`, `discrepancy`, `closed`

### Supplier Invoices (`supplier_invoice.*`)
`created`, `submitted`, `approved`, `disputed`, `matched`, `cancelled`, `paid`

### Supplier Claims (`supplier_claim.*`)
`opened`, `sent`, `acknowledged`, `credit_received`, `resolved`, `rejected`

### Three-Way Match (`three_way_match.*`)
`matched`, `discrepancy`, `overridden`

### Suppliers (`supplier.*`)
`created`, `updated`, `deactivated`, `activated`

---

## Inventario

### Inventory (`inventory.*`)
`movement_created`, `reserved`, `released`, `transferred`, `adjusted`

### Stock (compartidos por `inventory` y `lots`)
`stock.low`, `stock.expiring`

### Lots (`lot.*`)
`created`, `blocked`, `unblocked`, `expired`, `consumed`

### Inventory Counts (`inventory_count.*`)
`created`, `started`, `line_recorded`, `counted`, `approved`, `applied`, `cancelled`

### Picking (`picking.*`)
`created`, `assigned`, `started`, `item_picked`, `completed`, `staged`, `cancelled`, `short`

### Products (`product.*`)
`created`, `updated`, `activated`, `discontinued`, `deleted`

---

## Finanzas

### Payments (`payment.*`)
`created`, `registered`, `applied`, `reconciled`, `failed`, `cancelled`

### Payment Orders (`payment_order.*`, `payment_batch.*`)
`created`, `approved`, `paid`, `batch_processed`

### Cashbox (`cashbox.*`)
`created`, `opened`, `closed`, `closed_with_diff`

### Checks (`check.*`)
`received`, `deposited`, `cleared`, `bounced`, `endorsed`, `returned`, `cancelled`

### Accounts (`account.*`)
`entry_created`, `entry_settled`, `entry_overdue`

### Reconciliation (`reconciliation.*`)
`matched`, `rejected`

### Bank Accounts (`bank_account.*`)
`created`, `updated`

### Bank Statements (`bank_statement.*`)
`imported`, `reconciled`

### Withholdings (`withholding.*`, `withholding_padron.*`)
`applied`, `suffered`, `padron_imported`

### Commissions (`commission.*`)
`accrued`, `approved`, `paid`, `reversed`

### Collector Renditions (`rendition.*`)
`created`, `submitted`, `approved`, `rejected`

---

## Logística

### Shipments (`shipment.*`)
`created`, `loaded`, `departed`, `stop_arrived`, `stop_delivered`, `stop_rejected`, `stop_partial`, `completed`, `cancelled`

### Dispatch Sheets (`dispatch_sheet.*`)
`created`, `printed`, `dispatched`, `closed`

### Routes (`route.*`, `customer_visit.*`)
`created`, `updated`, `deleted`, `visit_planned`, `visit_removed`, `customer_visit.logged`

### Drivers (`driver.*`)
`created`, `updated`, `deleted`

### Vehicles (`vehicle.*`)
`created`, `updated`, `deleted`

---

## Fiscal / Configuración comercial

### Fiscal Authorizations (`fiscal.*`)
`authorization_logged` (además relanza `invoice.cae_*` — ver Invoices)

### Jurisdictions (`jurisdiction.*`)
`created`, `updated`, `customer_linked`

### Invoice Types (`invoice-type.*`)
`created`, `updated`, `deleted`

### Payment Conditions (`payment-condition.*`)
`created`, `updated`, `deleted`

### Payment Methods (`payment-method.*`)
`created`, `updated`, `deleted`

### Taxes (`tax.*`)
`created`, `updated`, `deleted`

### Price Lists (`price-list.*`)
`created`, `updated`, `deleted`

### Sales Zones (`sales_zone.*`)
`created`, `updated`, `deleted`

---

## Catálogos / Maestros

### Brands (`brand.*`)
`created`, `updated`, `deleted`

### Categories (`category.*`)
`created`, `updated`, `deleted`

### Units (`unit.*`)
`created`, `updated`, `deleted`

### Warehouses (`warehouse.*`)
`created`, `updated`, `deleted`

### Warehouse Locations (`warehouse_location.*`)
`created`, `updated`, `deleted`

### Branches (`branch.*`)
`created`, `updated`, `deleted`

---

## Sistema

### Users (`user.*`)
`created`, `updated`, `deactivated`

### Roles (`role.*`)
`created`, `updated`, `deleted`

### Company (`company.*`)
`updated`

### Integrations (`integration.*`)
`enabled`, `sync.started`, `sync.succeeded`, `sync.failed`, `paused`

### Support Tickets (`support_ticket.*`)
`created`, `updated`, `status_changed`, `priority_changed`, `resolved`, `reopened`, `attachment_added`, `customer_message`, `support_message`, `agent_replied`, `agent_failed`, `handed_off_to_human`, `returned_to_agent`

---

## Nombres canónicos

Cada archivo exporta su objeto tipado:

| Módulo | Export |
|---|---|
| accounts | `AccountEvents` |
| bank-accounts | `BankAccountEvents` |
| bank-statements | `BankStatementEvents` |
| branches | `BranchEvents` |
| brands | `BrandEvents` |
| cashbox | `CashboxEvents` |
| categories | `CategoryEvents` |
| checks | `CheckEvents` |
| collector-renditions | `CollectorRenditionEvents` |
| commissions | `CommissionEvents` |
| company | `CompanyEvents` |
| credit-notes | `CreditNoteEvents` |
| customers | `CustomerEvents` |
| debit-notes | `DebitNoteEvents` |
| delivery-notes | `DeliveryNoteEvents` |
| dispatch-sheets | `DispatchSheetEvents` |
| drivers | `DriverEvents` |
| fiscal-authorizations | `FiscalAuthorizationEvents` |
| integrations | `IntegrationEvents` |
| inventory | `InventoryEvents` |
| inventory-counts | `InventoryCountEvents` |
| invoice-types | `InvoiceTypeEvents` |
| invoices | `InvoiceEvents` |
| jurisdictions | `JurisdictionEvents` |
| lots | `LotEvents` |
| orders | `OrderEvents` |
| payment-conditions | `PaymentConditionEvents` |
| payment-methods | `PaymentMethodEvents` |
| payment-orders | `PaymentOrderEvents` |
| payments | `PaymentEvents` |
| picking | `PickingEvents` |
| price-lists | `PriceListEvents` |
| products | `ProductEvents` |
| promotions | `PromotionEvents` |
| purchases | `PurchaseEvents` |
| reconciliation | `ReconciliationEvents` |
| returns | `ReturnEvents` |
| roles | `RoleEvents` |
| routes | `RouteEvents` |
| sales-zones | `SalesZoneEvents` |
| shipments | `ShipmentEvents` |
| supplier-claims | `SupplierClaimEvents` |
| supplier-delivery-notes | `SupplierDeliveryNoteEvents` |
| supplier-invoices | `SupplierInvoiceEvents` |
| suppliers | `SupplierEvents` |
| support-tickets | `SupportTicketEvents` |
| taxes | `TaxEvents` |
| three-way-match | `ThreeWayMatchEvents` |
| units | `UnitEvents` |
| users | `UserEvents` |
| vehicles | `VehicleEvents` |
| warehouse-locations | `WarehouseLocationEvents` |
| warehouses | `WarehouseEvents` |
| withholdings | `WithholdingEvents` |
