import { Entity, Column, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { RouteVisitEntity } from './route-visit.entity';

@Entity('routes')
export class RouteEntity extends BaseEntity {
  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ name: 'zone_id', nullable: true })
  zoneId: string;

  @Column({ name: 'default_seller_id', nullable: true })
  defaultSellerId: string;

  @Column({ name: 'default_driver_id', nullable: true })
  defaultDriverId: string;

  @Column({ default: 'weekly' })
  frequency: string; // daily | weekly | biweekly | monthly | custom

  @Column({ type: 'jsonb', nullable: true })
  weekdays: number[] | null;

  @Column({ default: 'active' })
  status: string;

  @OneToMany(() => RouteVisitEntity, (v) => v.route, { cascade: true })
  visits: RouteVisitEntity[];
}
