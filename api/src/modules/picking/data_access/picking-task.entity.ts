import { Entity, Column, Generated, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { PickingTaskItemEntity } from './picking-task-item.entity';

@Entity('picking_tasks')
export class PickingTaskEntity extends BaseEntity {
  @Column()
  @Generated('increment')
  number: number;

  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @Column({ name: 'shipment_id', nullable: true })
  shipmentId: string;

  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: string;

  @Column({ default: 'pending' })
  status: string; // pending | assigned | in_progress | picked | staged | cancelled

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'integer', default: 0 })
  priority: number;

  @OneToMany(() => PickingTaskItemEntity, (i) => i.task, { cascade: true })
  items: PickingTaskItemEntity[];
}
