import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { SupportTicketEntity } from './support-ticket.entity';

@Entity('support_ticket_events')
export class SupportTicketEventEntity extends BaseEntity {
  @Index()
  @Column({ name: 'ticket_id', type: 'varchar', length: 40 })
  ticketId: string;

  @ManyToOne(() => SupportTicketEntity, (t) => t.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: SupportTicketEntity;

  @Column({ name: 'event_type' })
  eventType: string; // created | status_changed | commented | updated | priority_changed

  @Column({ name: 'actor_user_id', type: 'varchar', length: 40, nullable: true })
  actorUserId: string | null;

  @Column({ name: 'actor_type', default: 'user' })
  actorType: string; // user | agent | system

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;
}
