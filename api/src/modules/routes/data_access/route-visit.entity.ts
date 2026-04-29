import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { RouteEntity } from './route.entity';

@Entity('route_visits')
export class RouteVisitEntity extends BaseEntity {
  @Column({ name: 'route_id' })
  routeId: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ type: 'integer', default: 0 })
  sequence: number;

  @Column({ name: 'visit_window', nullable: true })
  visitWindow: string; // morning | afternoon | all_day

  @ManyToOne(() => RouteEntity, (r) => r.visits)
  @JoinColumn({ name: 'route_id' })
  route: RouteEntity;
}
