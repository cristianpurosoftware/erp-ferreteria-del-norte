import { Entity, Column, Generated } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('payment_batches')
export class PaymentBatchEntity extends BaseEntity {
  @Column()
  @Generated('increment')
  number: number;

  @Column({ name: 'bank_account_id' })
  bankAccountId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ default: 'draft' })
  status: string; // draft | processed | cancelled

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ name: 'file_url', nullable: true })
  fileUrl: string;
}
