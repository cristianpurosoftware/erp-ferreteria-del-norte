import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { IntegrationEntity } from './integration.entity';

@Entity('integration_events')
export class IntegrationEventEntity extends BaseEntity {
  @Column({ name: 'integration_id' })
  integrationId: string;

  @ManyToOne(() => IntegrationEntity, (i) => i.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'integration_id' })
  integration: IntegrationEntity;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ name: 'external_reference', nullable: true })
  externalReference: string;

  @Column({ name: 'internal_reference', nullable: true })
  internalReference: string;

  @Column({ default: 'pending' })
  status: string; // pending, success, failed

  @Column({ type: 'jsonb', nullable: true })
  detail: Record<string, any>;
}
