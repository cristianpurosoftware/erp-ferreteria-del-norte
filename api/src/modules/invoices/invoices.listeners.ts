import eventBus from '../../common/event-bus';
import { createEntryIdempotent } from '../accounts/accounts.service';
import { InvoiceEvents } from './invoices.events';
import { InvoiceEntity } from './data_access/invoice.entity';

/**
 * Closes the loop "issued invoice → debt in customer account corriente".
 *
 * Triggers on `invoice.accepted` (AFIP CAE received) so the entry only lands
 * when the invoice is fiscally valid. If a tenant runs without AFIP, they can
 * also wire this to `invoice.issued`.
 */
export function registerInvoiceListeners() {
  const handler = async (invoice: InvoiceEntity) => {
    if (!invoice?.id || !invoice.customerId) return;
    const total = Number(invoice.total ?? 0);
    if (total <= 0) return;
    try {
      await createEntryIdempotent({
        entityType: 'customer',
        entityId: invoice.customerId,
        type: 'debit',
        concept: `Invoice ${invoice.number ?? invoice.id.slice(0, 8)}`,
        amount: total,
        referenceType: 'invoice',
        referenceId: invoice.id,
      });
    } catch (err) {
      console.error(`[invoices.listeners] failed to debit account for invoice ${invoice.id}:`, err);
    }
  };

  eventBus.on(InvoiceEvents.ACCEPTED, handler);
  // Fallback for tenants without AFIP — guarded by idempotency in createEntryIdempotent
  eventBus.on(InvoiceEvents.ISSUED, handler);
}
