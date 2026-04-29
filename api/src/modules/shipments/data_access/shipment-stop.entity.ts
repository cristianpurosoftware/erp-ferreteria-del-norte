import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { ShipmentEntity } from './shipment.entity';

@Entity('shipment_stops')
export class ShipmentStopEntity extends BaseEntity {
  @Column({ name: 'shipment_id' })
  shipmentId: string;

  @Column({ type: 'integer', default: 0 })
  sequence: number;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'address_id', nullable: true })
  addressId: string;

  @Column({ name: 'planned_window', nullable: true })
  plannedWindow: string;

  @Column({ name: 'arrived_at', type: 'timestamp', nullable: true })
  arrivedAt: Date;

  @Column({ name: 'departed_at', type: 'timestamp', nullable: true })
  departedAt: Date;

  @Column({ default: 'pending' })
  status: string; // pending | arrived | delivered | partial | rejected | not_visited

  @Column({ name: 'delivery_note_id', nullable: true })
  deliveryNoteId: string;

  @Column({ name: 'signature_url', nullable: true })
  signatureUrl: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lng: number;

  @ManyToOne(() => ShipmentEntity, (s) => s.stops)
  @JoinColumn({ name: 'shipment_id' })
  shipment: ShipmentEntity;
}
