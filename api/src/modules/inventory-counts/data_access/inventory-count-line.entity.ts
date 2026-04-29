import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { InventoryCountEntity } from './inventory-count.entity';

@Entity('inventory_count_lines')
export class InventoryCountLineEntity extends BaseEntity {
  @Column({ name: 'inventory_count_id' })
  inventoryCountId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'lot_id', nullable: true })
  lotId: string;

  @Column({ name: 'location_id', nullable: true })
  locationId: string;

  @Column({ name: 'system_qty', type: 'decimal', precision: 12, scale: 2, default: 0 })
  systemQty: number;

  @Column({ name: 'counted_qty', type: 'decimal', precision: 12, scale: 2, nullable: true })
  countedQty: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  difference: number;

  @Column({ name: 'reason_code', nullable: true })
  reasonCode: string;

  @ManyToOne(() => InventoryCountEntity, (c) => c.lines)
  @JoinColumn({ name: 'inventory_count_id' })
  count: InventoryCountEntity;
}
