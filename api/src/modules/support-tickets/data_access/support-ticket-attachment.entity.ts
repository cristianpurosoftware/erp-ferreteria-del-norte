import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import BaseEntity from '../../../common/base.entity';
import { SupportTicketEntity } from './support-ticket.entity';
import { SupportTicketMessageEntity } from './support-ticket-message.entity';

@Entity('support_ticket_attachments')
export class SupportTicketAttachmentEntity extends BaseEntity {
  @Index()
  @Column({ name: 'ticket_id', type: 'varchar', length: 40 })
  ticketId: string;

  @ManyToOne(() => SupportTicketEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: SupportTicketEntity;

  @Index()
  @Column({ name: 'message_id', type: 'varchar', length: 40, nullable: true })
  messageId: string | null;

  @ManyToOne(() => SupportTicketMessageEntity, (m) => m.attachments, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'message_id' })
  message: SupportTicketMessageEntity | null;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: number;

  @Column({ name: 'storage_key' })
  storageKey: string;

  @Column({ name: 'uploaded_by_user_id', type: 'varchar', length: 40 })
  uploadedByUserId: string;
}
