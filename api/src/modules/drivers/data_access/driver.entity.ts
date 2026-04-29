import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('drivers')
export class DriverEntity extends BaseEntity {
  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ nullable: true })
  dni: string;

  @Column({ name: 'license_number', nullable: true })
  licenseNumber: string;

  @Column({ name: 'license_expires', type: 'date', nullable: true })
  licenseExpires: Date;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: 'active' })
  status: string;
}
