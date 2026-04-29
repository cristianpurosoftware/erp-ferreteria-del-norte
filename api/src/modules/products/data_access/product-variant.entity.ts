import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { ProductEntity } from './product.entity';

@Entity('product_variants')
export class ProductVariantEntity extends BaseEntity {
  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => ProductEntity, (p) => p.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  @Column()
  code: string;

  @Column({ type: 'jsonb', nullable: true })
  attributes: Record<string, any> | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost: number | null;

  @Column({ default: 'active' })
  status: string;
}
