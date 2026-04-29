import { Entity, Column, Generated } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('payment_orders')
export class PaymentOrderEntity extends BaseEntity {
  @Column()
  @Generated('increment')
  number: number;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ default: 'ARS' })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ default: 'draft' })
  status: string; // draft | approved | paid | cancelled

  @Column({ name: 'payment_batch_id', nullable: true })
  paymentBatchId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
