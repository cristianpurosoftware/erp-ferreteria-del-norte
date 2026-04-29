import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('permissions')
export class PermissionEntity extends BaseEntity {
  @Column({ unique: true })
  name: string; // format: resource:action

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  section: string; // grouping: users, roles, products, etc.
}
