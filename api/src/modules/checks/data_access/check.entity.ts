import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('checks')
export class CheckEntity extends BaseEntity {
  @Column()
  number: string;

  @Column({ name: 'bank_name' })
  bankName: string;

  @Column({ nullable: true })
  branch: string;

  @Column({ name: 'account_holder' })
  accountHolder: string;

  @Column({ nullable: true })
  cuit: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: Date;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({ default: 'common' })
  kind: string; // common | deferred

  @Column({ name: 'own_or_third', default: 'third' })
  ownOrThird: string;

  @Column({ name: 'received_from_customer_id', nullable: true })
  receivedFromCustomerId: string;

  @Column({ name: 'endorsed_to_supplier_id', nullable: true })
  endorsedToSupplierId: string;

  @Column({ name: 'bank_account_id', nullable: true })
  bankAccountId: string;

  @Column({ default: 'received' })
  status: string; // received | in_portfolio | deposited | cleared | bounced | endorsed | returned_to_customer | cancelled

  @Column({ name: 'deposited_at', type: 'timestamp', nullable: true })
  depositedAt: Date;

  @Column({ name: 'cleared_at', type: 'timestamp', nullable: true })
  clearedAt: Date;

  @Column({ name: 'bounced_at', type: 'timestamp', nullable: true })
  bouncedAt: Date;

  @Column({ name: 'bounce_reason', nullable: true })
  bounceReason: string;
}
