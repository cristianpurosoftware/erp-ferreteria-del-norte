import { Entity, Column, Unique, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { AccountEntryEntity } from './account-entry.entity';

@Entity('accounts')
@Unique(['entityType', 'entityId'])
export class AccountEntity extends BaseEntity {
  @Column({ name: 'entity_type' })
  entityType: string;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ name: 'current_balance', type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentBalance: number;

  @Column({ name: 'overdue_balance', type: 'decimal', precision: 12, scale: 2, default: 0 })
  overdueBalance: number;

  @Column({ name: 'credit_limit', type: 'decimal', precision: 12, scale: 2, default: 0 })
  creditLimit: number;

  @OneToMany(() => AccountEntryEntity, (e) => e.account)
  entries: AccountEntryEntity[];
}
