import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { CollectorRenditionEntity } from './collector-rendition.entity';

@Entity('collector_rendition_lines')
export class CollectorRenditionLineEntity extends BaseEntity {
  @Column({ name: 'collector_rendition_id' })
  collectorRenditionId: string;

  @Column({ name: 'payment_id' })
  paymentId: string;

  @Column({ name: 'declared_amount', type: 'decimal', precision: 12, scale: 2 })
  declaredAmount: number;

  @Column({ name: 'accepted_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  acceptedAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  difference: number;

  @Column({ nullable: true })
  reason: string;

  @ManyToOne(() => CollectorRenditionEntity, (r) => r.lines)
  @JoinColumn({ name: 'collector_rendition_id' })
  rendition: CollectorRenditionEntity;
}
