import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { CashboxEntity } from './cashbox.entity';

@Entity('cashbox_sessions')
export class CashboxSessionEntity extends BaseEntity {
  @Column({ name: 'cashbox_id' })
  cashboxId: string;

  @ManyToOne(() => CashboxEntity, (c) => c.sessions)
  @JoinColumn({ name: 'cashbox_id' })
  cashbox: CashboxEntity;

  @Column({ name: 'opened_by' })
  openedBy: string;

  @Column({ name: 'opened_at', type: 'timestamp' })
  openedAt: Date;

  @Column({ name: 'closed_by', nullable: true })
  closedBy: string;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date;

  @Column({ name: 'opening_balance', type: 'decimal', precision: 12, scale: 2 })
  openingBalance: number;

  @Column({ name: 'closing_balance', type: 'decimal', precision: 12, scale: 2, nullable: true })
  closingBalance: number;

  @Column({ name: 'expected_balance', type: 'decimal', precision: 12, scale: 2, nullable: true })
  expectedBalance: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  difference: number;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
