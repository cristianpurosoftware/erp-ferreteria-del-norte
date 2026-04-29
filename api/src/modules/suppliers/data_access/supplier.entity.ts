import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('suppliers')
export class SupplierEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'tax_id', nullable: true })
  taxId: string;

  @Column({ name: 'primary_contact', nullable: true })
  primaryContact: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'payment_condition', nullable: true })
  paymentCondition: string;

  @Column({ default: 'active' })
  status: string;
}
