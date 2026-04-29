import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('stock_movements')
export class StockMovementEntity extends BaseEntity {
  @Column()
  type: string;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  date: Date;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'variant_id', nullable: true })
  variantId: string | null;

  @Column({ name: 'source_warehouse_id', nullable: true })
  sourceWarehouseId: string | null;

  @Column({ name: 'dest_warehouse_id', nullable: true })
  destWarehouseId: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ nullable: true })
  reason: string | null;

  @Column({ name: 'reference_type', nullable: true })
  referenceType: string | null;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string | null;

  @Column({ name: 'user_id', nullable: true })
  userId: string | null;

  // Phase 2 additions
  @Column({ name: 'lot_id', nullable: true })
  lotId: string | null;

  @Column({ name: 'source_location_id', nullable: true })
  sourceLocationId: string | null;

  @Column({ name: 'dest_location_id', nullable: true })
  destLocationId: string | null;

  @Column({ name: 'reason_code', nullable: true })
  reasonCode: string | null;
}
