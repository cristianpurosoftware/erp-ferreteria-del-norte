import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('vehicles')
export class VehicleEntity extends BaseEntity {
  @Column()
  plate: string;

  @Column({ nullable: true })
  model: string;

  @Column({ name: 'capacity_kg', type: 'decimal', precision: 10, scale: 2, nullable: true })
  capacityKg: number;

  @Column({ name: 'capacity_m3', type: 'decimal', precision: 10, scale: 2, nullable: true })
  capacityM3: number;

  @Column({ default: 'active' })
  status: string; // active | maintenance | retired
}
