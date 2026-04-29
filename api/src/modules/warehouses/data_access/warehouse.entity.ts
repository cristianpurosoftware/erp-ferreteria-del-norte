import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('warehouses')
export class WarehouseEntity extends BaseEntity {
  @Column({ name: 'branch_id' })
  branchId: string;

  @Column()
  name: string;

  @Column({ default: 'physical' })
  type: string; // physical, virtual

  @Column({ default: 'active' })
  status: string; // active, inactive
}
