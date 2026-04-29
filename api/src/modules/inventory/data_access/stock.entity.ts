import { Entity, Column, Unique } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('stock')
@Unique(['productId', 'variantId', 'warehouseId'])
export class StockEntity extends BaseEntity {
  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'variant_id', nullable: true })
  variantId: string | null;

  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @Column({ name: 'available_qty', type: 'decimal', precision: 12, scale: 2, default: 0 })
  availableQty: number;

  @Column({ name: 'reserved_qty', type: 'decimal', precision: 12, scale: 2, default: 0 })
  reservedQty: number;

  @Column({ name: 'in_transit_qty', type: 'decimal', precision: 12, scale: 2, default: 0 })
  inTransitQty: number;

  @Column({ name: 'min_stock', type: 'decimal', precision: 12, scale: 2, default: 0 })
  minStock: number;
}
