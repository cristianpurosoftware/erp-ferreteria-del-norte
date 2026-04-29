import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { CustomerEntity } from './customer.entity';

@Entity('addresses')
export class AddressEntity extends BaseEntity {
  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => CustomerEntity, (c) => c.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity;

  @Column({ default: 'shipping' })
  type: string; // shipping, billing, admin

  @Column()
  street: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  province: string;

  @Column({ nullable: true })
  country: string;

  @Column({ name: 'postal_code', nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  notes: string;
}
