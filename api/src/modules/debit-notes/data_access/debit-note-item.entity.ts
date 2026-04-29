import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { DebitNoteEntity } from './debit-note.entity';

@Entity('debit_note_items')
export class DebitNoteItemEntity extends BaseEntity {
  @Column({ name: 'debit_note_id' })
  debitNoteId: string;

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

  @ManyToOne(() => DebitNoteEntity, (d) => d.items)
  @JoinColumn({ name: 'debit_note_id' })
  debitNote: DebitNoteEntity;
}
