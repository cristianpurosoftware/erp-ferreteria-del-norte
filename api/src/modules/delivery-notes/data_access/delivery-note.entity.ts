import { Entity, Column, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { DeliveryNoteItemEntity } from './delivery-note-item.entity';

@Entity('delivery_notes')
export class DeliveryNoteEntity extends BaseEntity {
  @Column()
  number: string;

  @Column({ name: 'sales_point', nullable: true })
  salesPoint: string;

  @Column({ name: 'invoice_type', default: 'X' })
  invoiceType: string; // X | R

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: Date;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @Column({ name: 'shipment_stop_id', nullable: true })
  shipmentStopId: string;

  @Column({ name: 'warehouse_id', nullable: true })
  warehouseId: string;

  @Column({ name: 'driver_id', nullable: true })
  driverId: string;

  @Column({ name: 'vehicle_id', nullable: true })
  vehicleId: string;

  @Column({ default: 'draft' })
  status: string; // draft | issued | invoiced | cancelled

  @Column({ name: 'invoice_id', nullable: true })
  invoiceId: string;

  @Column({ nullable: true })
  cae: string;

  @Column({ name: 'cae_expiration', type: 'date', nullable: true })
  caeExpiration: Date;

  @OneToMany(() => DeliveryNoteItemEntity, (i) => i.deliveryNote, { cascade: true })
  items: DeliveryNoteItemEntity[];
}
