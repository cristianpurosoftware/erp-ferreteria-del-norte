import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('payment_conditions')
export class PaymentConditionEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'integer', default: 0 })
  days: number;

  @Column({ nullable: true })
  description: string;
}
