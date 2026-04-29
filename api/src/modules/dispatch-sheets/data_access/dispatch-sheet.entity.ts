import { Entity, Column, Generated } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('dispatch_sheets')
export class DispatchSheetEntity extends BaseEntity {
  @Column()
  @Generated('increment')
  number: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'vehicle_id', nullable: true })
  vehicleId: string;

  @Column({ name: 'driver_id', nullable: true })
  driverId: string;

  @Column({ name: 'warehouse_id', nullable: true })
  warehouseId: string;

  @Column({ default: 'draft' })
  status: string; // draft | printed | dispatched | closed

  @Column({ type: 'text', nullable: true })
  notes: string;
}
