import { Entity, Column, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { ProductVariantEntity } from './product-variant.entity';

@Entity('products')
export class ProductEntity extends BaseEntity {
  @Column({ unique: true, nullable: true })
  sku: string | null;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string | null;

  @Column({ name: 'brand_id', nullable: true })
  brandId: string | null;

  @Column({ name: 'unit_id', nullable: true })
  unitId: string | null;

  @Column({ name: 'product_type', default: 'physical' })
  productType: string;

  @Column({ name: 'base_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  basePrice: number;

  @Column({ name: 'base_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  baseCost: number;

  @Column({ name: 'controls_stock', default: true })
  controlsStock: boolean;

  @Column({ name: 'min_stock', type: 'integer', default: 0 })
  minStock: number;

  @Column({ default: 'draft' })
  status: string;

  // Phase 2 additions
  @Column({ name: 'tracks_lot', default: false })
  tracksLot: boolean;

  @Column({ name: 'tracks_serial', default: false })
  tracksSerial: boolean;

  @Column({ name: 'shelf_life_days', type: 'integer', nullable: true })
  shelfLifeDays: number;

  @Column({ name: 'reorder_point', type: 'decimal', precision: 12, scale: 2, default: 0 })
  reorderPoint: number;

  @Column({ name: 'lead_time_days', type: 'integer', default: 0 })
  leadTimeDays: number;

  @Column({ name: 'preferred_supplier_id', nullable: true })
  preferredSupplierId: string;

  @OneToMany(() => ProductVariantEntity, (v) => v.product)
  variants: ProductVariantEntity[];
}
