import eventBus from '../../common/event-bus';
import { releaseReservation, markReservationsConsumed } from './inventory.service';

export function registerInventoryListeners() {
  // releaseReservation is now idempotent — if there are no active reservations
  // (already released, never reserved), it returns [] without throwing.
  eventBus.on('order.cancelled', async (payload: { id: string }) => {
    try {
      await releaseReservation(payload.id);
    } catch (error) {
      console.error(`Failed to release reservation for order ${payload.id}:`, error);
    }
  });

  // When the order leaves the warehouse, close out the reservation rows so
  // reservedQty doesn't stay inflated forever.
  eventBus.on('order.dispatched', async (payload: { id: string }) => {
    try {
      await markReservationsConsumed(payload.id);
    } catch (error) {
      console.error(`Failed to mark reservations consumed for order ${payload.id}:`, error);
    }
  });
}
