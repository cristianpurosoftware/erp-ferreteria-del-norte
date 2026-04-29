import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { PriceListEntity } from './price-list.entity';

@Entity('price_list_items')
export class PriceListItemEntity extends BaseEntity {
  @Column({ name: 'price_list_id' })
  priceListId: string;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ name: 'min_quantity', type: 'integer', default: 1 })
  minQuantity: number;

  // Phase 1 additions
  @Column({ name: 'valid_from', type: 'date', nullable: true })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo: Date;

  @ManyToOne(() => PriceListEntity, (pl) => pl.items)
  @JoinColumn({ name: 'price_list_id' })
  priceList: PriceListEntity;
}
