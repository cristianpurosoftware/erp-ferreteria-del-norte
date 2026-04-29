import { Entity, Column, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { PurchaseOrderItemEntity } from './purchase-order-item.entity';

@Entity('purchase_orders')
export class PurchaseOrderEntity extends BaseEntity {
  @Column({ name: 'supplier_id' })
  supplierId: string;

  @Column({ name: 'branch_id', nullable: true })
  branchId: string;

  @Column({ type: 'timestamp', default: () => 'now()' })
  date: Date;

  @Column({ default: 'draft' })
  status: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxes: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => PurchaseOrderItemEntity, (i) => i.purchaseOrder, { cascade: true })
  items: PurchaseOrderItemEntity[];
}
