import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { OrderEntity } from './order.entity';

@Entity('order_items')
export class OrderItemEntity extends BaseEntity {
  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => OrderEntity, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'variant_id', nullable: true })
  variantId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;
}
