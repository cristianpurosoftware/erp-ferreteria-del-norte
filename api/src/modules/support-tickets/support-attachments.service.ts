import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { AppDataSource } from '../../config/data-source';
import { env } from '../../config/env';
import { BusinessLogicError, NotFoundError } from '../../common/errors';
import { getContext } from '../../common/request-context';
import eventBus from '../../common/event-bus';
import { SupportTicketEntity } from './data_access/support-ticket.entity';
import { SupportTicketAttachmentEntity } from './data_access/support-ticket-attachment.entity';
import { SupportTicketEventEntity } from './data_access/support-ticket-event.entity';
import { SupportTicketEvents } from './support-tickets.events';

const ticketRepo = AppDataSource.getRepository(SupportTicketEntity);
const attachmentRepo = AppDataSource.getRepository(SupportTicketAttachmentEntity);
const eventRepo = AppDataSource.getRepository(SupportTicketEventEntity);

let _s3: S3Client | null = null;
function s3Client(): S3Client {
  if (_s3) return _s3;
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new BusinessLogicError(
      'ATTACHMENTS_DISABLED',
      'El almacenamiento de adjuntos no está configurado (faltan credenciales AWS/Tigris)',
    );
  }
  _s3 = new S3Client({
    endpoint: env.AWS_ENDPOINT_URL_S3,
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
  return _s3;
}

function bucket(): string {
  if (!env.BUCKET_NAME) {
    throw new BusinessLogicError(
      'ATTACHMENTS_DISABLED',
      'El almacenamiento de adjuntos no está configurado (BUCKET_NAME vacío)',
    );
  }
  return env.BUCKET_NAME;
}

export function attachmentsEnabled(): boolean {
  return Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.BUCKET_NAME);
}

function safeFileName(name: string): string {
  return name
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120)
    || 'file';
}

function currentUserId(fallback?: string): string {
  if (fallback) return fallback;
  const ctx = getContext();
  if (!ctx?.userId) {
    throw new BusinessLogicError('NO_AUTH_CONTEXT', 'No hay usuario autenticado');
  }
  return ctx.userId;
}

export async function uploadAttachment(
  ticketId: string,
  file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  userIdOverride?: string,
  messageId?: string,
): Promise<SupportTicketAttachmentEntity> {
  const ticket = await ticketRepo.findOne({ where: { id: ticketId } });
  if (!ticket) throw new NotFoundError('Ticket de soporte no encontrado');
  if (ticket.status === 'resolved') {
    throw new BusinessLogicError(
      'TICKET_RESOLVED',
      'No se pueden adjuntar archivos a un ticket resuelto',
    );
  }
  if (file.size > env.ATTACHMENT_MAX_BYTES) {
    throw new BusinessLogicError(
      'ATTACHMENT_TOO_LARGE',
      `El adjunto excede el tamaño máximo (${env.ATTACHMENT_MAX_BYTES} bytes)`,
    );
  }

  const attachmentId = randomUUID();
  const key = `${env.CLIENT_SLUG}/soporte/${ticketId}/adjuntos/${attachmentId}-${safeFileName(file.originalname)}`;

  await s3Client().send(new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ContentLength: file.size,
    // Objects are private. Download happens via time-limited pre-signed URLs.
  }));

  const uploadedByUserId = currentUserId(userIdOverride);
  const row = attachmentRepo.create({
    id: attachmentId,
    ticketId,
    messageId: messageId ?? null,
    fileName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    storageKey: key,
    uploadedByUserId,
  });
  const saved = await attachmentRepo.save(row);

  const ev = eventRepo.create({
    ticketId,
    eventType: 'attachment_added',
    actorUserId: uploadedByUserId,
    actorType: 'user',
    body: file.originalname,
    payload: {
      attachmentId: saved.id,
      fileName: saved.fileName,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
    },
  });
  await eventRepo.save(ev);

  ticket.lastActivityAt = new Date();
  await ticketRepo.save(ticket);

  eventBus.emit(SupportTicketEvents.ATTACHMENT_ADDED, { ticketId, attachmentId: saved.id });
  return saved;
}

export async function listAttachments(ticketId: string): Promise<SupportTicketAttachmentEntity[]> {
  return attachmentRepo.find({
    where: { ticketId },
    order: { createdAt: 'ASC' },
  });
}

export async function getDownloadUrl(attachmentId: string): Promise<{ url: string; fileName: string }> {
  const row = await attachmentRepo.findOne({ where: { id: attachmentId } });
  if (!row) throw new NotFoundError('Adjunto no encontrado');
  const url = await getSignedUrl(
    s3Client(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: row.storageKey,
      ResponseContentDisposition: `attachment; filename="${row.fileName.replace(/"/g, '')}"`,
    }),
    { expiresIn: 300 }, // 5 min
  );
  return { url, fileName: row.fileName };
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  const row = await attachmentRepo.findOne({ where: { id: attachmentId } });
  if (!row) throw new NotFoundError('Adjunto no encontrado');
  try {
    await s3Client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: row.storageKey }));
  } catch {
    // if S3 delete fails, still remove the DB row so it doesn't haunt us
  }
  await attachmentRepo.softDelete({ id: attachmentId });
}
