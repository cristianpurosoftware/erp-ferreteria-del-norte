import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { ReturnOrderEntity } from './return-order.entity';

@Entity('return_order_items')
export class ReturnOrderItemEntity extends BaseEntity {
  @Column({ name: 'return_order_id' })
  returnOrderId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'lot_id', nullable: true })
  lotId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ name: 'reason_code', nullable: true })
  reasonCode: string;

  @Column({ default: 'resellable' })
  condition: string; // resellable | damaged | expired | quarantine

  @Column({ name: 'dest_location_id', nullable: true })
  destLocationId: string;

  @Column({ name: 'credit_note_id', nullable: true })
  creditNoteId: string;

  @ManyToOne(() => ReturnOrderEntity, (r) => r.items)
  @JoinColumn({ name: 'return_order_id' })
  returnOrder: ReturnOrderEntity;
}
