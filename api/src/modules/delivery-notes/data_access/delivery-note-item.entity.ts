import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { DeliveryNoteEntity } from './delivery-note.entity';

@Entity('delivery_note_items')
export class DeliveryNoteItemEntity extends BaseEntity {
  @Column({ name: 'delivery_note_id' })
  deliveryNoteId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'lot_id', nullable: true })
  lotId: string;

  @Column({ name: 'order_item_id', nullable: true })
  orderItemId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  unitPrice: number;

  @ManyToOne(() => DeliveryNoteEntity, (d) => d.items)
  @JoinColumn({ name: 'delivery_note_id' })
  deliveryNote: DeliveryNoteEntity;
}
