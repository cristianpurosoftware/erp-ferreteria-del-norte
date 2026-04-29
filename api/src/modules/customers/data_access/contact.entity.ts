import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { CustomerEntity } from './customer.entity';

@Entity('contacts')
export class ContactEntity extends BaseEntity {
  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => CustomerEntity, (c) => c.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity;

  @Column()
  name: string;

  @Column({ nullable: true })
  position: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;
}
