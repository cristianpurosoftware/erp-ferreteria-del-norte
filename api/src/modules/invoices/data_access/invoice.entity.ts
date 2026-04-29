import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('invoices')
export class InvoiceEntity extends BaseEntity {
  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @Column({ name: 'type_id', nullable: true })
  typeId: string;

  @Column({ nullable: true })
  number: string;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate: Date;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxes: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ default: 'draft' })
  status: string;

  @Column({ name: 'fiscal_integration_status', nullable: true })
  fiscalIntegrationStatus: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Phase 5 additions
  @Column({ nullable: true })
  cae: string;

  @Column({ name: 'cae_expiration', type: 'date', nullable: true })
  caeExpiration: Date;

  @Column({ name: 'sales_point', nullable: true })
  salesPoint: string;

  @Column({ name: 'invoice_type', nullable: true })
  invoiceType: string;

  @Column({ name: 'jurisdiction_id', nullable: true })
  jurisdictionId: string;

  @Column({ name: 'original_invoice_id', nullable: true })
  originalInvoiceId: string;

  @Column({ name: 'delivery_note_id', nullable: true })
  deliveryNoteId: string;

  @Column({ name: 'shipment_stop_id', nullable: true })
  shipmentStopId: string;
}
