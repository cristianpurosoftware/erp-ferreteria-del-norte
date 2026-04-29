import { Entity, Column, Generated } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('supplier_delivery_notes')
export class SupplierDeliveryNoteEntity extends BaseEntity {
  @Column()
  @Generated('increment')
  number: number;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @Column({ name: 'supplier_delivery_note_number' })
  supplierDeliveryNoteNumber: string;

  @Column({ name: 'purchase_order_id', nullable: true })
  purchaseOrderId: string;

  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @Column({ name: 'received_at', type: 'timestamp', default: () => 'now()' })
  receivedAt: Date;

  @Column({ default: 'draft' })
  status: string; // draft | received | discrepancy | closed
}
