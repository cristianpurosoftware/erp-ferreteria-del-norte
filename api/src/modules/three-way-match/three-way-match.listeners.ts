import eventBus from '../../common/event-bus';
import { SupplierInvoiceEvents } from '../supplier-invoices/supplier-invoices.events';
import { runMatch } from './three-way-match.service';

export function registerThreeWayMatchListeners() {
  eventBus.on(SupplierInvoiceEvents.CREATED, async (invoice: any) => {
    if (!invoice?.purchaseOrderId) return;
    try {
      await runMatch(invoice.id);
    } catch (e) {
      console.error(`three-way-match auto-run failed for invoice ${invoice?.id}:`, e);
    }
  });
}
