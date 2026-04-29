import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('customer_jurisdictions')
export class CustomerJurisdictionEntity extends BaseEntity {
  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'jurisdiction_id' })
  jurisdictionId: string;

  @Column({ default: 'inscripto' })
  condition: string; // inscripto | no_inscripto | exento | convenio_multilateral

  @Column({ name: 'inscription_number', nullable: true })
  inscriptionNumber: string;

  @Column({ type: 'date', nullable: true })
  since: Date;

  @Column({ type: 'date', nullable: true })
  until: Date;
}
