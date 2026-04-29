import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('reconciliation_matches')
export class ReconciliationMatchEntity extends BaseEntity {
  @Column({ name: 'bank_statement_line_id' })
  bankStatementLineId: string;

  @Column({ name: 'payment_id', nullable: true })
  paymentId: string;

  @Column({ name: 'check_id', nullable: true })
  checkId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'matched_by', nullable: true })
  matchedBy: string;

  @Column({ name: 'matched_at', type: 'timestamp', default: () => 'now()' })
  matchedAt: Date;

  @Column({ default: 'proposed' })
  status: string; // proposed | confirmed | rejected
}
