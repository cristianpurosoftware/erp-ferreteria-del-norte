import { Entity, Column, Generated, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { ReturnOrderItemEntity } from './return-order-item.entity';

@Entity('return_orders')
export class ReturnOrderEntity extends BaseEntity {
  @Column()
  @Generated('increment')
  number: number;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'shipment_id', nullable: true })
  shipmentId: string;

  @Column({ name: 'shipment_stop_id', nullable: true })
  shipmentStopId: string;

  @Column({ name: 'original_order_id', nullable: true })
  originalOrderId: string;

  @Column({ default: 'commercial' })
  kind: string; // not_delivered | rejected_by_customer | damaged | expired | commercial

  @Column({ default: 'draft' })
  status: string; // draft | confirmed | received | inspected | closed | cancelled

  @Column({ name: 'received_at', type: 'timestamp', nullable: true })
  receivedAt: Date;

  @Column({ name: 'warehouse_id', nullable: true })
  warehouseId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => ReturnOrderItemEntity, (i) => i.returnOrder, { cascade: true })
  items: ReturnOrderItemEntity[];
}
