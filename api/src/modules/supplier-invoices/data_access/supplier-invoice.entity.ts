import { Entity, Column, Generated, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { SupplierInvoiceItemEntity } from './supplier-invoice-item.entity';

@Entity('supplier_invoices')
export class SupplierInvoiceEntity extends BaseEntity {
  @Column()
  @Generated('increment')
  number: number;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @Column({ name: 'invoice_type', default: 'A' })
  invoiceType: string; // A | B | C | E

  @Column({ name: 'supplier_invoice_number' })
  supplierInvoiceNumber: string;

  @Column({ name: 'sales_point', nullable: true })
  salesPoint: string;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: Date;

  @Column({ name: 'reception_date', type: 'date', nullable: true })
  receptionDate: Date;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date;

  @Column({ default: 'ARS' })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxes: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  perceptions: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ default: 'draft' })
  status: string; // draft | pending_approval | matched | approved | paid | cancelled | disputed

  @Column({ nullable: true })
  cae: string;

  @Column({ name: 'cae_expiration', type: 'date', nullable: true })
  caeExpiration: Date;

  @Column({ name: 'purchase_order_id', nullable: true })
  purchaseOrderId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => SupplierInvoiceItemEntity, (i) => i.invoice, { cascade: true })
  items: SupplierInvoiceItemEntity[];
}
