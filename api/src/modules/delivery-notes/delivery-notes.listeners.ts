import eventBus from '../../common/event-bus';
import { ShipmentEvents } from '../shipments/shipments.events';
import { createFromShipmentStop } from './delivery-notes.service';

export function registerDeliveryNotesListeners() {
  eventBus.on(ShipmentEvents.STOP_DELIVERED, async (stop: any) => {
    try {
      await createFromShipmentStop(stop.id);
    } catch (e) {
      console.error(`auto delivery-note create failed for stop ${stop?.id}:`, e);
    }
  });
}
