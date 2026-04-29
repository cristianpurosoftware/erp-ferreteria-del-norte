import eventBus from '../../common/event-bus';
import { createEntryIdempotent } from '../accounts/accounts.service';
import { SupplierInvoiceEvents } from './supplier-invoices.events';
import { SupplierInvoiceEntity } from './data_access/supplier-invoice.entity';

/**
 * Closes the loop "approved supplier invoice → debt with the supplier".
 *
 * For supplier accounts, "we owe more" is modeled as a debit entry (mirrors the
 * customer side where a debit means "they owe us more"). Idempotent — same
 * supplier_invoice id never duplicates.
 */
export function registerSupplierInvoiceListeners() {
  eventBus.on(SupplierInvoiceEvents.APPROVED, async (si: SupplierInvoiceEntity) => {
    if (!si?.id || !si.supplierId) return;
    const total = Number(si.total ?? 0);
    if (total <= 0) return;
    try {
      await createEntryIdempotent({
        entityType: 'supplier',
        entityId: si.supplierId,
        type: 'debit',
        concept: `Supplier invoice ${si.supplierInvoiceNumber ?? si.id.slice(0, 8)}`,
        amount: total,
        referenceType: 'supplier_invoice',
        referenceId: si.id,
      });
    } catch (e) {
      console.error(`[supplier-invoices.listeners] failed to debit supplier ${si.supplierId}:`, e);
    }
  });
}
