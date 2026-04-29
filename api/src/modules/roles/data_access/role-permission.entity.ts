import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { RoleEntity } from './role.entity';
import { PermissionEntity } from '../../permissions/data_access/permission.entity';

@Entity('role_permissions')
export class RolePermissionEntity extends BaseEntity {
  @Column({ name: 'role_id' })
  roleId: string;

  @ManyToOne(() => RoleEntity, (r) => r.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  @Column({ name: 'permission_id' })
  permissionId: string;

  @ManyToOne(() => PermissionEntity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission: PermissionEntity;
}
