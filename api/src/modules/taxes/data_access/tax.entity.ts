import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('taxes')
export class TaxEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  rate: number;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ default: 'active' })
  status: string; // active, inactive

  // Phase 5 additions
  @Column({ name: 'jurisdiction_id', nullable: true })
  jurisdictionId: string;

  @Column({ default: 'iva' })
  kind: string; // iva | iibb | municipal | ganancias | other

  @Column({ name: 'is_perception', default: false })
  isPerception: boolean;

  @Column({ name: 'is_withholding', default: false })
  isWithholding: boolean;

  @Column({ name: 'rate_type', default: 'percentage' })
  rateType: string;
}
