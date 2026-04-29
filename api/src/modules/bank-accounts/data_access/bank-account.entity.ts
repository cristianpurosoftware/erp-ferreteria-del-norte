import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('bank_accounts')
export class BankAccountEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'bank_name' })
  bankName: string;

  @Column({ nullable: true })
  cbu: string;

  @Column({ nullable: true })
  alias: string;

  @Column({ default: 'ARS' })
  currency: string;

  @Column({ name: 'account_number', nullable: true })
  accountNumber: string;

  @Column({ default: 'active' })
  status: string;
}
