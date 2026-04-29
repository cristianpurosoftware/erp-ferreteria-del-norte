import { Entity, Column, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { BankStatementLineEntity } from './bank-statement-line.entity';

@Entity('bank_statements')
export class BankStatementEntity extends BaseEntity {
  @Column({ name: 'bank_account_id' })
  bankAccountId: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: Date;

  @Column({ name: 'opening_balance', type: 'decimal', precision: 12, scale: 2, default: 0 })
  openingBalance: number;

  @Column({ name: 'closing_balance', type: 'decimal', precision: 12, scale: 2, default: 0 })
  closingBalance: number;

  @Column({ name: 'imported_at', type: 'timestamp', default: () => 'now()' })
  importedAt: Date;

  @Column({ default: 'manual' })
  source: string; // manual | csv | api

  @Column({ default: 'imported' })
  status: string;

  @OneToMany(() => BankStatementLineEntity, (l) => l.statement, { cascade: true })
  lines: BankStatementLineEntity[];
}
