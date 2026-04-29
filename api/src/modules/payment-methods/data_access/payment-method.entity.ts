import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('payment_methods')
export class PaymentMethodEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  description: string;
}
