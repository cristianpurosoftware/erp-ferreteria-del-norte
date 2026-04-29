import { Entity, Column, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { PriceListItemEntity } from './price-list-item.entity';

@Entity('price_lists')
export class PriceListEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ default: 'ARS' })
  currency: string;

  @Column({ name: 'valid_from', type: 'date', nullable: true })
  validFrom: Date;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil: Date;

  @Column({ default: 'active' })
  status: string; // active, inactive

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  // Phase 1 additions
  @Column({ name: 'min_qty', type: 'integer', default: 1 })
  minQty: number;

  @Column({ nullable: true })
  channel: string;

  @Column({ name: 'customer_category', nullable: true })
  customerCategory: string;

  @Column({ name: 'zone_id', nullable: true })
  zoneId: string;

  @OneToMany(() => PriceListItemEntity, (item) => item.priceList)
  items: PriceListItemEntity[];
}
