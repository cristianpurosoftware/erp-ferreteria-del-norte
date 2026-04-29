import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { SupplierInvoiceEntity } from './supplier-invoice.entity';

@Entity('supplier_invoice_items')
export class SupplierInvoiceItemEntity extends BaseEntity {
  @Column({ name: 'supplier_invoice_id' })
  supplierInvoiceId: string;

  @Column({ name: 'product_id', nullable: true })
  productId: string;

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 12, scale: 2 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ name: 'purchase_order_item_id', nullable: true })
  purchaseOrderItemId: string;

  @Column({ name: 'reception_item_id', nullable: true })
  receptionItemId: string;

  @ManyToOne(() => SupplierInvoiceEntity, (i) => i.items)
  @JoinColumn({ name: 'supplier_invoice_id' })
  invoice: SupplierInvoiceEntity;
}
