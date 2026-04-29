import { Entity, Column, Generated, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { CollectorRenditionLineEntity } from './collector-rendition-line.entity';

@Entity('collector_renditions')
export class CollectorRenditionEntity extends BaseEntity {
  @Column()
  @Generated('increment')
  number: number;

  @Column({ name: 'collector_id' })
  collectorId: string;

  @Column({ name: 'shipment_id', nullable: true })
  shipmentId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ default: 'draft' })
  status: string; // draft | submitted | approved | rejected

  @Column({ name: 'total_cash', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCash: number;

  @Column({ name: 'total_checks', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalChecks: number;

  @Column({ name: 'total_transfers', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalTransfers: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => CollectorRenditionLineEntity, (l) => l.rendition, { cascade: true })
  lines: CollectorRenditionLineEntity[];
}
