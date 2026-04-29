import eventBus from '../../common/event-bus';
import { ShipmentEvents } from '../shipments/shipments.events';
import { AppDataSource } from '../../config/data-source';
import { OrderEntity } from '../orders/data_access/order.entity';
import { OrderItemEntity } from '../orders/data_access/order-item.entity';
import { create as createReturn } from './returns.service';

export function registerReturnsListeners() {
  // When a shipment stop is rejected, auto-create a draft return pre-populated with the order items
  eventBus.on(ShipmentEvents.STOP_REJECTED, async (stop: any) => {
    try {
      const orderRepo = AppDataSource.getRepository(OrderEntity);
      const itemRepo = AppDataSource.getRepository(OrderItemEntity);
      const order = await orderRepo.findOne({ where: { id: stop.orderId } });
      if (!order) return;
      const items = await itemRepo.find({ where: { orderId: stop.orderId } });
      await createReturn({
        customerId: stop.customerId,
        shipmentId: stop.shipmentId,
        shipmentStopId: stop.id,
        originalOrderId: stop.orderId,
        kind: 'rejected_by_customer',
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          condition: 'resellable',
        })),
      });
    } catch (e) {
      console.error(`auto-return create failed for stop ${stop?.id}:`, e);
    }
  });
}
