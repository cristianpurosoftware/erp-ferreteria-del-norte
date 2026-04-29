import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('commissions')
export class CommissionEntity extends BaseEntity {
  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'invoice_id', nullable: true })
  invoiceId: string;

  @Column({ name: 'base_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  baseAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  rate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column({ default: 'accrued' })
  status: string; // accrued | approved | paid | reversed

  @Column({ name: 'accrued_at', type: 'timestamp', default: () => 'now()' })
  accruedAt: Date;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'payment_id', nullable: true })
  paymentId: string;
}
