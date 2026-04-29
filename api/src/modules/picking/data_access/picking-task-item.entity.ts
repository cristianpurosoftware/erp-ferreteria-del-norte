import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { PickingTaskEntity } from './picking-task.entity';

@Entity('picking_task_items')
export class PickingTaskItemEntity extends BaseEntity {
  @Column({ name: 'picking_task_id' })
  pickingTaskId: string;

  @Column({ name: 'order_item_id', nullable: true })
  orderItemId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'lot_id', nullable: true })
  lotId: string;

  @Column({ name: 'source_location_id', nullable: true })
  sourceLocationId: string;

  @Column({ name: 'requested_qty', type: 'decimal', precision: 12, scale: 2 })
  requestedQty: number;

  @Column({ name: 'picked_qty', type: 'decimal', precision: 12, scale: 2, default: 0 })
  pickedQty: number;

  @Column({ default: 'pending' })
  status: string; // pending | picked | short | skipped

  @ManyToOne(() => PickingTaskEntity, (t) => t.items)
  @JoinColumn({ name: 'picking_task_id' })
  task: PickingTaskEntity;
}
