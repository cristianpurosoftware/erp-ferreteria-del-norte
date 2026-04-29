import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('payments')
export class PaymentEntity extends BaseEntity {
  @Column()
  type: string;

  @Column({ type: 'timestamp', default: () => 'now()' })
  date: Date;

  @Column({ name: 'customer_id', nullable: true })
  customerId: string;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: string;

  @Column({ name: 'payment_method' })
  paymentMethod: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'ARS' })
  currency: string;

  @Column({ name: 'external_reference', nullable: true })
  externalReference: string;

  @Column({ default: 'draft' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Phase 6 additions
  @Column({ default: 'in' })
  direction: string; // in | out

  @Column({ name: 'collector_id', nullable: true })
  collectorId: string;

  @Column({ name: 'check_id', nullable: true })
  checkId: string;

  @Column({ name: 'bank_account_id', nullable: true })
  bankAccountId: string;

  @Column({ name: 'collector_rendition_id', nullable: true })
  collectorRenditionId: string;

  @Column({ name: 'invoice_id', nullable: true })
  invoiceId: string;

  @Column({ name: 'payment_order_id', nullable: true })
  paymentOrderId: string;
}
