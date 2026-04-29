import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { BankStatementEntity } from './bank-statement.entity';

@Entity('bank_statement_lines')
export class BankStatementLineEntity extends BaseEntity {
  @Column({ name: 'bank_statement_id' })
  bankStatementId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column()
  kind: string; // credit | debit

  @Column({ name: 'external_reference', nullable: true })
  externalReference: string;

  @Column({ default: false })
  matched: boolean;

  @Column({ name: 'reconciliation_match_id', nullable: true })
  reconciliationMatchId: string;

  @ManyToOne(() => BankStatementEntity, (s) => s.lines)
  @JoinColumn({ name: 'bank_statement_id' })
  statement: BankStatementEntity;
}
