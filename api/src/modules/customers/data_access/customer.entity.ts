import { Entity, Column, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { ContactEntity } from './contact.entity';
import { AddressEntity } from './address.entity';

@Entity('customers')
export class CustomerEntity extends BaseEntity {
  @Column({ name: 'customer_type', default: 'company' })
  customerType: string; // company, individual

  @Column({ name: 'legal_name' })
  legalName: string;

  @Column({ name: 'commercial_name', nullable: true })
  commercialName: string;

  @Column({ name: 'tax_id', nullable: true })
  taxId: string;

  @Column({ name: 'tax_condition', nullable: true })
  taxCondition: string;

  @Column({ nullable: true })
  channel: string;

  @Column({ name: 'assigned_seller_id', nullable: true })
  assignedSellerId: string;

  @Column({ name: 'price_list_id', nullable: true })
  priceListId: string;

  @Column({ name: 'credit_limit', type: 'decimal', precision: 12, scale: 2, default: 0 })
  creditLimit: number;

  @Column({ default: 'draft' })
  status: string; // draft, active, on_hold, blocked, inactive, archived

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  // Phase 1 additions
  @Column({ nullable: true })
  category: string; // A | B | C

  @Column({ name: 'zone_id', nullable: true })
  zoneId: string;

  @Column({ name: 'route_id', nullable: true })
  routeId: string;

  @Column({ name: 'credit_policy', default: 'normal' })
  creditPolicy: string; // normal | strict | blocked

  @Column({ name: 'block_on_overdue', default: false })
  blockOnOverdue: boolean;

  @Column({ name: 'overdue_days_threshold', type: 'integer', default: 30 })
  overdueDaysThreshold: number;

  @OneToMany(() => ContactEntity, (c) => c.customer, { cascade: true })
  contacts: ContactEntity[];

  @OneToMany(() => AddressEntity, (a) => a.customer, { cascade: true })
  addresses: AddressEntity[];
}
