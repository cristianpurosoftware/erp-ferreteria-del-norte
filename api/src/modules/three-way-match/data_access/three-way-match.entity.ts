import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('three_way_matches')
export class ThreeWayMatchEntity extends BaseEntity {
  @Column({ name: 'purchase_order_id' })
  purchaseOrderId: string;

  @Column({ name: 'supplier_delivery_note_id', nullable: true })
  supplierDeliveryNoteId: string;

  @Column({ name: 'supplier_invoice_id' })
  supplierInvoiceId: string;

  @Column({ default: 'pending' })
  status: string; // pending | matched | discrepancy | overridden

  @Column({ type: 'jsonb', nullable: true })
  discrepancies: Record<string, any>[] | null;

  @Column({ name: 'overridden_by', nullable: true })
  overriddenBy: string;

  @Column({ name: 'overridden_at', type: 'timestamp', nullable: true })
  overriddenAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
