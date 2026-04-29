import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('warehouse_locations')
export class WarehouseLocationEntity extends BaseEntity {
  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @Column()
  code: string;

  @Column({ nullable: true })
  aisle: string;

  @Column({ nullable: true })
  rack: string;

  @Column({ nullable: true })
  shelf: string;

  @Column({ nullable: true })
  bin: string;

  @Column({ default: 'pick' })
  kind: string; // pick | bulk | quarantine | returns | staging

  @Column({ default: 'active' })
  status: string;
}
