import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('units_of_measure')
export class UnitEntity extends BaseEntity {
  @Column()
  name: string;

  @Column()
  abbreviation: string;

  @Column()
  type: string; // weight, volume, count, length
}
