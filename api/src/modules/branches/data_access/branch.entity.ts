import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { CompanyEntity } from '../../company/data_access/company.entity';

@Entity('branches')
export class BranchEntity extends BaseEntity {
  @Column({ name: 'company_id' })
  company_id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ default: 'active' })
  status: string;

  @ManyToOne(() => CompanyEntity)
  @JoinColumn({ name: 'company_id' })
  company: CompanyEntity;
}
