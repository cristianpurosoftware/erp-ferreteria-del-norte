import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { PurchaseOrderEntity } from './purchase-order.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItemEntity extends BaseEntity {
  @Column({ name: 'purchase_order_id' })
  purchaseOrderId: string;

  @ManyToOne(() => PurchaseOrderEntity, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrderEntity;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 12, scale: 2 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  // Phase 4 additions
  @Column({ name: 'received_qty', type: 'decimal', precision: 12, scale: 2, default: 0 })
  receivedQty: number;

  @Column({ name: 'invoiced_qty', type: 'decimal', precision: 12, scale: 2, default: 0 })
  invoicedQty: number;
}
