import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { RoleEntity } from '../../roles/data_access/role.entity';

@Entity('users')
export class UserEntity extends BaseEntity {
  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password_hash: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: 'active' })
  status: string; // active, inactive, suspended

  @Column({ name: 'role_id' })
  roleId: string;

  @ManyToOne(() => RoleEntity, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date;
}
