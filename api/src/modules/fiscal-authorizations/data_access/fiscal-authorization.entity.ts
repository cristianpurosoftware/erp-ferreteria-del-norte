import { Entity, Column } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('fiscal_authorizations')
export class FiscalAuthorizationEntity extends BaseEntity {
  @Column({ name: 'document_type' })
  documentType: string; // invoice | credit_note | debit_note

  @Column({ name: 'document_id' })
  documentId: string;

  @Column({ default: 'afip' })
  provider: string;

  @Column({ nullable: true })
  cae: string;

  @Column({ name: 'cae_expiration', type: 'date', nullable: true })
  caeExpiration: Date;

  @Column({ name: 'requested_at', type: 'timestamp', default: () => 'now()' })
  requestedAt: Date;

  @Column({ name: 'granted_at', type: 'timestamp', nullable: true })
  grantedAt: Date;

  @Column({ name: 'request_payload', type: 'jsonb', nullable: true })
  requestPayload: Record<string, any> | null;

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload: Record<string, any> | null;

  @Column({ default: 'requested' })
  status: string; // requested | granted | rejected | retry
}
