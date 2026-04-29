import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { PromotionEntity } from './promotion.entity';

@Entity('promotion_items')
export class PromotionItemEntity extends BaseEntity {
  @Column({ name: 'promotion_id' })
  promotionId: string;

  @Column({ name: 'product_id', nullable: true })
  productId: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Column({ name: 'discount_pct', type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountPct: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  discountAmount: number;

  @Column({ name: 'buy_qty', type: 'integer', nullable: true })
  buyQty: number;

  @Column({ name: 'get_qty', type: 'integer', nullable: true })
  getQty: number;

  @Column({ name: 'override_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  overridePrice: number;

  @ManyToOne(() => PromotionEntity, (p) => p.items)
  @JoinColumn({ name: 'promotion_id' })
  promotion: PromotionEntity;
}
