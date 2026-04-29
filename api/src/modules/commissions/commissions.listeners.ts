import eventBus from '../../common/event-bus';
import { OrderEvents } from '../orders/orders.events';
import { accrueForOrder } from './commissions.service';

export function registerCommissionListeners() {
  eventBus.on(OrderEvents.DELIVERED, async (payload: any) => {
    try {
      await accrueForOrder({
        id: payload.id,
        sellerId: payload.sellerId,
        total: Number(payload.total ?? 0),
      });
    } catch (error) {
      console.error(`Failed to accrue commission for order ${payload?.id}:`, error);
    }
  });
}
