import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('audit_events')
export class AuditEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'actor_type' })
  actor_type: string; // 'user' | 'system' | 'agent'

  @Column({ name: 'actor_id', nullable: true })
  actor_id: string;

  @Column()
  action: string;

  @Column({ name: 'entity_type' })
  entity_type: string;

  @Column({ name: 'entity_id' })
  entity_id: string;

  @Column({ name: 'previous_state', type: 'jsonb', nullable: true })
  previous_state: Record<string, any> | null;

  @Column({ name: 'new_state', type: 'jsonb', nullable: true })
  new_state: Record<string, any> | null;

  @Column({ name: 'ip_address', nullable: true })
  ip_address: string;

  @Column({ default: 'success' })
  result: string;
}
