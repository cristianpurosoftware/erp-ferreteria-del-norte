import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('sales_zones')
export class SalesZoneEntity extends BaseEntity {
  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'parent_zone_id', nullable: true })
  parentZoneId: string;

  @Column({ default: 'active' })
  status: string;
}
