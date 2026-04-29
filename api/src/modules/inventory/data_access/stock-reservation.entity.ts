import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('stock_reservations')
export class StockReservationEntity extends BaseEntity {
  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'variant_id', nullable: true })
  variantId: string | null;

  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ default: 'active' })
  status: string;

  // Phase 2 additions
  @Column({ name: 'lot_id', nullable: true })
  lotId: string | null;

  @Column({ name: 'location_id', nullable: true })
  locationId: string | null;

  // Phase 3 additions
  @Column({ name: 'picking_task_item_id', nullable: true })
  pickingTaskItemId: string | null;
}
