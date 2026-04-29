import eventBus from '../../common/event-bus';
import { AppDataSource } from '../../config/data-source';
import { CheckEvents } from './checks.events';
import * as accountsService from '../accounts/accounts.service';

/**
 * When a check bounces, reverse the associated payment's application:
 * create a reversing entry in the customer's account.
 */
export function registerChecksListeners() {
  eventBus.on(CheckEvents.BOUNCED, async (check: any) => {
    try {
      const rows = await AppDataSource.query(
        `SELECT p.id, p.customer_id, p.amount FROM payments p WHERE p.check_id = $1 LIMIT 1`,
        [check.id],
      );
      const payment = rows?.[0];
      if (!payment?.customer_id) return;
      await accountsService.createEntry({
        entityType: 'customer',
        entityId: payment.customer_id,
        type: 'debit',
        concept: `Cheque rechazado ${check.number} - reverso pago ${payment.id}`,
        amount: Number(payment.amount),
        referenceType: 'check_bounce',
        referenceId: check.id,
      });
    } catch (e) {
      console.error(`check bounce reversal failed for check ${check?.id}:`, e);
    }
  });
}
