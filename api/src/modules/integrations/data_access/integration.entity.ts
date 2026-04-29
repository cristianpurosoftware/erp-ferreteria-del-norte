import { Entity, Column, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { IntegrationEventEntity } from './integration-event.entity';

@Entity('integrations')
export class IntegrationEntity extends BaseEntity {
  @Column()
  provider: string;

  @Column()
  type: string;

  @Column({ default: 'inactive' })
  status: string; // inactive, active, syncing, degraded, failed, paused

  @Column({ name: 'credentials_ref', nullable: true })
  credentialsRef: string;

  @Column({ type: 'jsonb', nullable: true })
  configuration: Record<string, any>;

  @Column({ name: 'last_sync_at', nullable: true })
  lastSyncAt: Date;

  @OneToMany(() => IntegrationEventEntity, (e) => e.integration)
  events: IntegrationEventEntity[];
}
