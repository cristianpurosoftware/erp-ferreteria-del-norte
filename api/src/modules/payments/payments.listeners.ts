import eventBus from '../../common/event-bus';
import { createEntryIdempotent } from '../accounts/accounts.service';
import { PaymentEvents } from './payments.events';
import { PaymentEntity } from './data_access/payment.entity';

/**
 * Closes the loop "applied payment → credit in account corriente".
 *
 * Direction `in` (cobranza) credits the customer account.
 * Direction `out` (pago a proveedor) credits the supplier account
 * (i.e. lowers what we owe them).
 *
 * Idempotent — the same payment id won't double-post.
 */
export function registerPaymentListeners() {
  eventBus.on(PaymentEvents.APPLIED, async (payment: PaymentEntity) => {
    if (!payment?.id) return;
    const amount = Number(payment.amount ?? 0);
    if (amount <= 0) return;

    const direction = payment.direction === 'out' ? 'out' : 'in';
    const entityType = direction === 'in' ? 'customer' : 'supplier';
    const entityId = direction === 'in' ? payment.customerId : payment.supplierId;
    if (!entityId) return;

    try {
      await createEntryIdempotent({
        entityType,
        entityId,
        // Both directions reduce the entity's balance (which represents what
        // we are owed for customers, what we owe for suppliers): use 'credit'.
        type: 'credit',
        concept: `Payment ${payment.id.slice(0, 8)} (${payment.paymentMethod})`,
        amount,
        referenceType: 'payment',
        referenceId: payment.id,
      });
    } catch (err) {
      console.error(`[payments.listeners] failed to credit account for payment ${payment.id}:`, err);
    }
  });
}
