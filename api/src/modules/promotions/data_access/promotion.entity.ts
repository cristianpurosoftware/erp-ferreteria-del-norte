import { Entity, Column, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { PromotionItemEntity } from './promotion-item.entity';

@Entity('promotions')
export class PromotionEntity extends BaseEntity {
  @Column()
  code: string;

  @Column()
  name: string;

  @Column()
  kind: string; // discount_pct | discount_amount | nx+m | combo | price_override

  @Column({ name: 'valid_from', type: 'date', nullable: true })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo: Date;

  @Column({ nullable: true })
  channel: string;

  @Column({ name: 'customer_category', nullable: true })
  customerCategory: string;

  @Column({ name: 'zone_id', nullable: true })
  zoneId: string;

  @Column({ name: 'min_qty', type: 'integer', default: 1 })
  minQty: number;

  @Column({ type: 'integer', default: 0 })
  priority: number;

  @Column({ default: 'draft' })
  status: string; // draft | active | expired | cancelled

  @OneToMany(() => PromotionItemEntity, (i) => i.promotion, { cascade: true })
  items: PromotionItemEntity[];
}
