import { Entity, Column, Generated, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { ShipmentStopEntity } from './shipment-stop.entity';

@Entity('shipments')
export class ShipmentEntity extends BaseEntity {
  @Column()
  @Generated('increment')
  number: number;

  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @Column({ name: 'vehicle_id', nullable: true })
  vehicleId: string;

  @Column({ name: 'driver_id', nullable: true })
  driverId: string;

  @Column({ name: 'dispatch_sheet_id', nullable: true })
  dispatchSheetId: string;

  @Column({ name: 'planned_date', type: 'date' })
  plannedDate: Date;

  @Column({ name: 'departed_at', type: 'timestamp', nullable: true })
  departedAt: Date;

  @Column({ name: 'returned_at', type: 'timestamp', nullable: true })
  returnedAt: Date;

  @Column({ default: 'planned' })
  status: string; // planned | loaded | in_transit | completed | cancelled

  @Column({ name: 'total_stops', type: 'integer', default: 0 })
  totalStops: number;

  @Column({ name: 'total_weight_kg', type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalWeightKg: number;

  @OneToMany(() => ShipmentStopEntity, (s) => s.shipment, { cascade: true })
  stops: ShipmentStopEntity[];
}
