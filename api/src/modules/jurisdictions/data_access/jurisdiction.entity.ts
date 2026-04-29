import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('jurisdictions')
export class JurisdictionEntity extends BaseEntity {
  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ default: 'provincial' })
  kind: string; // national | provincial | municipal

  @Column({ name: 'parent_jurisdiction_id', nullable: true })
  parentJurisdictionId: string;
}
