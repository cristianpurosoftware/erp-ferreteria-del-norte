import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('companies')
export class CompanyEntity extends BaseEntity {
  @Column()
  razon_social: string;

  @Column()
  nombre_comercial: string;

  @Column({ default: 'ARS' })
  moneda_base: string;

  @Column({ default: 'AR' })
  pais: string;

  @Column({ type: 'jsonb', nullable: true })
  tax_ids: Record<string, any> | null;

  @Column({ nullable: true })
  logo_url: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ default: 'America/Argentina/Buenos_Aires' })
  timezone: string;

  @Column({ default: true })
  is_active: boolean;
}
