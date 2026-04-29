import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { SupportTicketEntity } from './support-ticket.entity';

@Entity('support_agent_runs')
export class SupportAgentRunEntity extends BaseEntity {
  @Index()
  @Column({ name: 'ticket_id', type: 'varchar', length: 40 })
  ticketId: string;

  @ManyToOne(() => SupportTicketEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: SupportTicketEntity;

  @Column({ name: 'conversation_key' })
  conversationKey: string; // e.g. "demo:support:{ticketId}"

  // Hermes-assigned run id (POST /v1/runs response). Nullable until the
  // initial request succeeds — a row with null hermes_run_id means we tried
  // but never got a handshake.
  @Column({ name: 'hermes_run_id', nullable: true, type: 'varchar' })
  hermesRunId: string | null;

  @Index()
  @Column({ default: 'queued' })
  status: string; // queued | running | completed | failed | cancelled

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @Column({ name: 'request_payload', type: 'jsonb', nullable: true })
  requestPayload: Record<string, unknown> | null;

  @Column({ name: 'response_summary', type: 'jsonb', nullable: true })
  responseSummary: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;
}
