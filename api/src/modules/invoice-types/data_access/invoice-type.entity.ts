import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('invoice_types')
export class InvoiceTypeEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  description: string;
}
