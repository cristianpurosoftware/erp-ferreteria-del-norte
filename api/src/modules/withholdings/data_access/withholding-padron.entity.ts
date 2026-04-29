import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('withholding_padrones')
export class WithholdingPadronEntity extends BaseEntity {
  @Column()
  kind: string; // iibb | ganancias | iva | suss

  @Column({ name: 'jurisdiction_id', nullable: true })
  jurisdictionId: string;

  @Column()
  cuit: string;

  @Column({ name: 'rate_perception', type: 'decimal', precision: 6, scale: 3, nullable: true })
  ratePerception: number;

  @Column({ name: 'rate_withholding', type: 'decimal', precision: 6, scale: 3, nullable: true })
  rateWithholding: number;

  @Column({ name: 'valid_from', type: 'date' })
  validFrom: Date;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo: Date;

  @Column({ nullable: true })
  source: string;
}
