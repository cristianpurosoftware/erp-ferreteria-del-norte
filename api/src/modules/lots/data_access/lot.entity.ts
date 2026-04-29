import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('lots')
export class LotEntity extends BaseEntity {
  @Column({ name: 'product_id' })
  productId: string;

  @Column()
  code: string;

  @Column({ name: 'manufacture_date', type: 'date', nullable: true })
  manufactureDate: Date;

  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate: Date;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: string;

  @Column({ name: 'received_at', type: 'timestamp', nullable: true })
  receivedAt: Date;

  @Column({ default: 'active' })
  status: string; // active | blocked | expired | consumed
}
