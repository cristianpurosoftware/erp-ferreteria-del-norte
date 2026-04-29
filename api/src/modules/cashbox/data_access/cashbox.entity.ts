import { Entity, Column, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { CashboxSessionEntity } from './cashbox-session.entity';

@Entity('cashboxes')
export class CashboxEntity extends BaseEntity {
  @Column({ name: 'branch_id' })
  branchId: string;

  @Column()
  name: string;

  @Column({ default: 'closed' })
  status: string;

  @OneToMany(() => CashboxSessionEntity, (s) => s.cashbox)
  sessions: CashboxSessionEntity[];
}
