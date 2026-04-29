import { Entity, Column, Generated } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('supplier_claims')
export class SupplierClaimEntity extends BaseEntity {
  @Column()
  @Generated('increment')
  number: number;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @Column({ name: 'supplier_invoice_id', nullable: true })
  supplierInvoiceId: string;

  @Column({ name: 'purchase_order_id', nullable: true })
  purchaseOrderId: string;

  @Column()
  kind: string; // short_qty | damaged | wrong_sku | overpricing | missing_cae

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  amount: number;

  @Column({ default: 'open' })
  status: string; // open | sent | acknowledged | credit_received | resolved | rejected

  @Column({ name: 'opened_by', nullable: true })
  openedBy: string;

  @Column({ name: 'opened_at', type: 'timestamp', default: () => 'now()' })
  openedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
