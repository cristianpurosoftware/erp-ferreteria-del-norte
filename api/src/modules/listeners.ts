// Central listener registration
// Each module registers its listeners here

import { registerAuditListeners } from './audit/audit.listeners';
import { registerInventoryListeners } from './inventory/inventory.listeners';
import { registerCommissionListeners } from './commissions/commissions.listeners';
import { registerPickingListeners } from './picking/picking.listeners';
import { registerReturnsListeners } from './returns/returns.listeners';
import { registerThreeWayMatchListeners } from './three-way-match/three-way-match.listeners';
import { registerDeliveryNotesListeners } from './delivery-notes/delivery-notes.listeners';
import { registerCreditNotesListeners } from './credit-notes/credit-notes.listeners';
import { registerChecksListeners } from './checks/checks.listeners';
import { registerCollectorRenditionListeners } from './collector-renditions/collector-renditions.listeners';
import { registerReconciliationListeners } from './reconciliation/reconciliation.listeners';
import { registerWithholdingsListeners } from './withholdings/withholdings.listeners';
import { registerInvoiceListeners } from './invoices/invoices.listeners';
import { registerPaymentListeners } from './payments/payments.listeners';
import { registerSupplierInvoiceListeners } from './supplier-invoices/supplier-invoices.listeners';

export function registerListeners() {
  registerAuditListeners();
  registerInventoryListeners();
  registerCommissionListeners();
  registerPickingListeners();
  registerReturnsListeners();
  registerThreeWayMatchListeners();
  registerDeliveryNotesListeners();
  registerCreditNotesListeners();
  registerChecksListeners();
  registerCollectorRenditionListeners();
  registerReconciliationListeners();
  registerWithholdingsListeners();
  registerInvoiceListeners();
  registerPaymentListeners();
  registerSupplierInvoiceListeners();
}
