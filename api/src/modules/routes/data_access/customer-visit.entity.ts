import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('customer_visits')
export class CustomerVisitEntity extends BaseEntity {
  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'route_id', nullable: true })
  routeId: string;

  @Column({ name: 'seller_id', nullable: true })
  sellerId: string;

  @Column({ name: 'visited_at', type: 'timestamp', default: () => 'now()' })
  visitedAt: Date;

  @Column({ default: 'no_order' })
  result: string; // ordered | no_order | closed | absent

  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lat: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lng: number;
}
