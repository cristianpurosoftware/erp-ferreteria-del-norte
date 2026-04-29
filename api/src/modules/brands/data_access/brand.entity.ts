import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('brands')
export class BrandEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ default: 'active' })
  status: string; // active, inactive
}
