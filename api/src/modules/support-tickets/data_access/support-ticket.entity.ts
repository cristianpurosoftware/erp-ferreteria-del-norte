import { Entity, Column, OneToMany, Index } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { SupportTicketEventEntity } from './support-ticket-event.entity';
import { SupportTicketMessageEntity } from './support-ticket-message.entity';

@Entity('support_tickets')
export class SupportTicketEntity extends BaseEntity {
  // Auto-incremented by the DB (SERIAL). TypeORM never writes to this column
  // on insert/update (insert: false, update: false) — the sequence fills it.
  @Column({ name: 'ticket_number', type: 'integer', insert: false, update: false, nullable: true })
  ticketNumber: number;

  @Column({ default: 'bug' })
  type: string; // bug | question | change

  // idle             — never dispatched (config missing / not yet)
  // ai_working       — Hermes is currently processing a request
  // waiting_customer — Soporte respondió y espera al cliente
  // awaiting_review  — Soporte pide revisión humana interna
  // human_handoff    — Derivado a persona; mensajes del cliente NO van a Hermes
  // resolved         — Ticket cerrado
  // failed           — Último request falló
  @Column({ name: 'agent_state', default: 'idle' })
  agentState: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ default: 'normal' })
  priority: string;

  @Column({ name: 'app_env', nullable: true, type: 'varchar' })
  appEnv: string | null;

  @Index()
  @Column({ default: 'created' })
  status: string; // created | in_progress | review | resolved

  @Index()
  @Column({ name: 'created_by_user_id', type: 'varchar', length: 40 })
  createdByUserId: string;

  @Column({ name: 'resolved_by_user_id', type: 'varchar', length: 40, nullable: true })
  resolvedByUserId: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Index()
  @Column({ name: 'last_activity_at', type: 'timestamp', default: () => 'now()' })
  lastActivityAt: Date;

  @OneToMany(() => SupportTicketEventEntity, (e) => e.ticket, { cascade: true })
  events: SupportTicketEventEntity[];

  @OneToMany(() => SupportTicketMessageEntity, (m) => m.ticket)
  messages: SupportTicketMessageEntity[];
}
