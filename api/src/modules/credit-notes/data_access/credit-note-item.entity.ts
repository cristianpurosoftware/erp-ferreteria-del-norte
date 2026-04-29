import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { CreditNoteEntity } from './credit-note.entity';

@Entity('credit_note_items')
export class CreditNoteItemEntity extends BaseEntity {
  @Column({ name: 'credit_note_id' })
  creditNoteId: string;

  @Column({ name: 'product_id', nullable: true })
  productId: string;

  @Column()
  description: string;

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

  @ManyToOne(() => CreditNoteEntity, (c) => c.items)
  @JoinColumn({ name: 'credit_note_id' })
  creditNote: CreditNoteEntity;
}
