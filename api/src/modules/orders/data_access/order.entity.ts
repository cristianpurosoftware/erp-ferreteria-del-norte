import { Entity, Column, Generated, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { OrderItemEntity } from './order-item.entity';

@Entity('orders')
export class OrderEntity extends BaseEntity {
  @Column()
  @Generated('increment')
  number: number;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'branch_id', nullable: true })
  branchId: string;

  @Column({ name: 'seller_id', nullable: true })
  sellerId: string;

  @Column({ nullable: true })
  channel: string;

  @Column({ default: 'draft' })
  status: string;

  @Column({ name: 'estimated_delivery_date', type: 'date', nullable: true })
  estimatedDeliveryDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxes: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discounts: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Phase 1 additions
  @Column({ name: 'zone_id', nullable: true })
  zoneId: string;

  @Column({ name: 'route_id', nullable: true })
  routeId: string;

  @Column({ name: 'operation_type', default: 'sale' })
  operationType: string; // sale | sample | donation | internal

  @Column({ name: 'promotion_id', nullable: true })
  promotionId: string;

  // Phase 3 additions
  @Column({ name: 'picking_status', nullable: true })
  pickingStatus: string;

  @Column({ name: 'shipment_id', nullable: true })
  shipmentId: string;

  @OneToMany(() => OrderItemEntity, (i) => i.order, { cascade: true })
  items: OrderItemEntity[];
}
