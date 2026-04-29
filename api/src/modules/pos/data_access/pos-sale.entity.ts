import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('pos_sales')
export class PosSaleEntity extends BaseEntity {
  @Column({ name: 'customer_id', nullable: true, type: 'varchar', length: 40 })
  customerId: string | null;

  @Column({ name: 'order_id', type: 'varchar', length: 40 })
  orderId: string;

  @Column({ name: 'invoice_id', nullable: true, type: 'varchar', length: 40 })
  invoiceId: string | null;

  @Column({ name: 'warehouse_id', type: 'varchar', length: 40 })
  warehouseId: string;

  @Column({ name: 'user_id', type: 'varchar', length: 40 })
  userId: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  taxes: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ name: 'payment_breakdown', type: 'jsonb', default: '[]' })
  paymentBreakdown: Array<{ method: string; amount: number }>;

  @Column({ default: 'completed' })
  status: string;

  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt: Date | null;

  @Column({ name: 'voided_by', nullable: true, type: 'varchar', length: 40 })
  voidedBy: string | null;
}
