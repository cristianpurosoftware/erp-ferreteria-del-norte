import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('stock_by_lot')
export class StockByLotEntity extends BaseEntity {
  @Column({ name: 'product_id' })
  productId: string;

  @Column({ name: 'lot_id' })
  lotId: string;

  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @Column({ name: 'location_id', nullable: true })
  locationId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  qty: number;
}
