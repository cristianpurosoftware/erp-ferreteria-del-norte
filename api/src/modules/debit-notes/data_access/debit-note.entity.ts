import { Entity, Column, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { DebitNoteItemEntity } from './debit-note-item.entity';

@Entity('debit_notes')
export class DebitNoteEntity extends BaseEntity {
  @Column({ nullable: true })
  number: string;

  @Column({ name: 'sales_point', nullable: true })
  salesPoint: string;

  @Column({ name: 'invoice_type', default: 'A' })
  invoiceType: string;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate: Date;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'original_invoice_id' })
  originalInvoiceId: string;

  @Column({ name: 'jurisdiction_id', nullable: true })
  jurisdictionId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxes: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ nullable: true })
  reason: string;

  @Column({ default: 'draft' })
  status: string;

  @Column({ nullable: true })
  cae: string;

  @Column({ name: 'cae_expiration', type: 'date', nullable: true })
  caeExpiration: Date;

  @OneToMany(() => DebitNoteItemEntity, (i) => i.debitNote, { cascade: true })
  items: DebitNoteItemEntity[];
}
