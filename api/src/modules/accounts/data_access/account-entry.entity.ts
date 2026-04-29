import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { AccountEntity } from './account.entity';

@Entity('account_entries')
export class AccountEntryEntity extends BaseEntity {
  @Column({ name: 'account_id' })
  accountId: string;

  @ManyToOne(() => AccountEntity, (a) => a.entries)
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity;

  @Column({ type: 'timestamp', default: () => 'now()' })
  date: Date;

  @Column()
  type: string;

  @Column()
  concept: string;

  @Column({ name: 'reference_type', nullable: true })
  referenceType: string;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'resulting_balance', type: 'decimal', precision: 12, scale: 2 })
  resultingBalance: number;

  @Column({ default: 'pending' })
  status: string;
}
