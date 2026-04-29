import { Entity, Column, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { RolePermissionEntity } from './role-permission.entity';

@Entity('roles')
export class RoleEntity extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'is_system_role', default: false })
  isSystemRole: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  // When true: the role gets a bypass for any HTTP GET endpoint (see
  // middlewares/permissions.ts), cannot be assigned to users (see
  // users.service), and combined with is_system_role it is protected
  // from deletion and editing. Reserved for the automated support agent.
  @Column({ name: 'support_access', default: false })
  supportAccess: boolean;

  @OneToMany(() => RolePermissionEntity, (rp) => rp.role, { eager: true })
  rolePermissions: RolePermissionEntity[];
}
