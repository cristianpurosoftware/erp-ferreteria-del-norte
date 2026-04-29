import eventBus from '../../common/event-bus';
import { AppDataSource } from '../../config/data-source';
import { lookupPadron, create as createWithholding } from './withholdings.service';

/**
 * When a payment with direction='in' is created and the customer has a jurisdiction,
 * lookup padron by CUIT + jurisdiction and auto-create a "suffered" withholding if applicable.
 */
export function registerWithholdingsListeners() {
  eventBus.on('payment.created', async (payment: any) => {
    try {
      if (payment?.direction !== 'in' || !payment?.customerId) return;
      const rows = await AppDataSource.query(
        `SELECT tax_id FROM customers WHERE id = $1`,
        [payment.customerId],
      );
      const cuit = await AppDataSource.query(`SELECT tax_id FROM customers WHERE id = $1`, [payment.customerId]);
      const taxId = rows?.[0]?.tax_id ?? cuit?.[0]?.tax_id;
      if (!taxId) return;

      const jurisdictions: any[] = await AppDataSource.query(
        `SELECT jurisdiction_id FROM customer_jurisdictions WHERE customer_id = $1 LIMIT 1`,
        [payment.customerId],
      );
      const jurisdictionId = jurisdictions?.[0]?.jurisdiction_id;

      const padron = await lookupPadron(taxId, 'iibb', jurisdictionId);
      if (!padron || !padron.ratePerception) return;

      const amount = Number(payment.amount) * Number(padron.ratePerception) / 100;
      if (amount <= 0) return;

      await createWithholding({
        kind: 'iibb',
        direction: 'suffered',
        jurisdictionId,
        customerId: payment.customerId,
        paymentId: payment.id,
        amount,
        date: new Date().toISOString().slice(0, 10),
      });
    } catch (e) {
      console.error(`withholding auto-apply failed for payment ${payment?.id}:`, e);
    }
  });
}
