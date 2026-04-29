import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('withholdings')
export class WithholdingEntity extends BaseEntity {
  @Column()
  kind: string; // iibb | ganancias | iva | suss

  @Column()
  direction: string; // suffered | applied

  @Column({ name: 'jurisdiction_id', nullable: true })
  jurisdictionId: string;

  @Column({ name: 'tax_id', nullable: true })
  taxId: string;

  @Column({ name: 'customer_id', nullable: true })
  customerId: string;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: string;

  @Column({ name: 'payment_id', nullable: true })
  paymentId: string;

  @Column({ name: 'invoice_id', nullable: true })
  invoiceId: string;

  @Column({ name: 'supplier_invoice_id', nullable: true })
  supplierInvoiceId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'certificate_number', nullable: true })
  certificateNumber: string;

  @Column({ type: 'date' })
  date: Date;
}
