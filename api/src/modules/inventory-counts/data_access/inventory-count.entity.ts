import { Entity, Column, Generated, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { InventoryCountLineEntity } from './inventory-count-line.entity';

@Entity('inventory_counts')
export class InventoryCountEntity extends BaseEntity {
  @Column()
  @Generated('increment')
  number: number;

  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @Column({ default: 'cycle' })
  kind: string; // cycle | full | spot

  @Column({ type: 'jsonb', nullable: true })
  scope: Record<string, any>;

  @Column({ default: 'draft' })
  status: string; // draft | in_progress | counted | approved | applied | cancelled

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @OneToMany(() => InventoryCountLineEntity, (l) => l.count, { cascade: true })
  lines: InventoryCountLineEntity[];
}
