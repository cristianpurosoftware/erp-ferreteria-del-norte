import eventBus from '../../common/event-bus';
import { AppDataSource } from '../../config/data-source';
import { ReconciliationEvents } from './reconciliation.events';

export function registerReconciliationListeners() {
  eventBus.on(ReconciliationEvents.MATCHED, async (match: any) => {
    try {
      if (match.paymentId) {
        await AppDataSource.query(`UPDATE payments SET status = 'reconciled' WHERE id = $1`, [match.paymentId]);
        eventBus.emit('payment.reconciled', { id: match.paymentId });
      }
      if (match.checkId) {
        await AppDataSource.query(`UPDATE checks SET status = 'cleared', cleared_at = now() WHERE id = $1 AND status = 'deposited'`, [match.checkId]);
        eventBus.emit('check.cleared', { id: match.checkId });
      }
    } catch (e) {
      console.error(`reconciliation.matched listener failed:`, e);
    }
  });
}
