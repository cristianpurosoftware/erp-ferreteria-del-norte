import eventBus from '../../common/event-bus';
import { OrderEvents } from '../orders/orders.events';
import { PickingEvents } from './picking.events';
import { onOrderStockReserved, onPickingCompleted } from './picking.service';

export function registerPickingListeners() {
  eventBus.on(OrderEvents.STOCK_RESERVED, async (payload: any) => {
    await onOrderStockReserved({ id: payload.id });
  });
  eventBus.on(PickingEvents.COMPLETED, async (payload: any) => {
    await onPickingCompleted({ id: payload.id, orderId: payload.orderId });
  });
}
