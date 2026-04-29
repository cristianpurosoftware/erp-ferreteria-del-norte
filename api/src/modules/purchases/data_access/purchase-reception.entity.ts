import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('purchase_receptions')
export class PurchaseReceptionEntity extends BaseEntity {
  @Column({ name: 'purchase_order_id' })
  purchaseOrderId: string;

  @Column({ type: 'timestamp', default: () => 'now()' })
  date: Date;

  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Phase 4 additions
  @Column({ name: 'supplier_delivery_note_id', nullable: true })
  supplierDeliveryNoteId: string;
}
