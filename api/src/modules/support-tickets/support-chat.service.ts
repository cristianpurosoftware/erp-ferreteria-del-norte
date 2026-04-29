import type { ModelMessage } from 'ai';
import { AppDataSource } from '../../config/data-source';
import { logger } from '../../common/logger';
import eventBus from '../../common/event-bus';
import { BusinessLogicError, NotFoundError } from '../../common/errors';
import { SupportTicketEntity } from './data_access/support-ticket.entity';
import { SupportTicketMessageEntity } from './data_access/support-ticket-message.entity';
import { SupportTicketAttachmentEntity } from './data_access/support-ticket-attachment.entity';
import { SupportTicketEvents } from './support-tickets.events';
import {
  agentEnabled,
  agentStatus,
  generateSupportReply,
  type AgentMetadata,
} from './support-agent.service';
import {
  attachmentsEnabled,
  getDownloadUrl as getAttachmentSignedUrl,
  uploadAttachment as uploadAttachmentToStorage,
} from './support-attachments.service';

type AttachmentFile = { originalname: string; mimetype: string; size: number; buffer: Buffer };

const ticketRepo = AppDataSource.getRepository(SupportTicketEntity);
const messageRepo = AppDataSource.getRepository(SupportTicketMessageEntity);
const attachmentRepo = AppDataSource.getRepository(SupportTicketAttachmentEntity);

// In-memory guard so a burst of customer messages doesn't fan out into
// several parallel AI requests for the same ticket. Survives only as long
// as the process — on restart, agentState='ai_working' is used as a DB
// fallback to avoid re-dispatching an already-running case.
const dispatching = new Set<string>();

// ─── Reads ────────────────────────────────────────────────────────

export async function listMessages(ticketId: string) {
  return messageRepo.find({
    where: { ticketId },
    order: { createdAt: 'ASC' },
  });
}

// ─── Write helpers ────────────────────────────────────────────────

export async function addSystemMessage(
  ticketId: string,
  body: string,
  metadata?: Record<string, unknown>,
) {
  const msg = messageRepo.create({
    ticketId,
    senderRole: 'system',
    senderKind: 'system',
    senderUserId: null,
    body,
    status: 'sent',
    metadata: metadata ?? null,
  });
  return messageRepo.save(msg);
}

export async function addCustomerMessage(
  ticketId: string,
  userId: string,
  body: string,
  files: AttachmentFile[] | undefined,
): Promise<SupportTicketMessageEntity> {
  const ticket = await ticketRepo.findOne({ where: { id: ticketId } });
  if (!ticket) throw new NotFoundError('Ticket de soporte no encontrado');
  if (ticket.status === 'resolved') {
    throw new BusinessLogicError(
      'TICKET_RESOLVED',
      'No se puede escribir en un ticket resuelto',
    );
  }

  const message = await messageRepo.save(messageRepo.create({
    ticketId,
    senderRole: 'customer',
    senderKind: 'user',
    senderUserId: userId,
    body,
    status: 'sent',
  }));

  if (files?.length) {
    for (const file of files) {
      try {
        await uploadAttachmentToStorage(ticketId, file, userId, message.id);
      } catch (err) {
        logger.warn({ err, ticketId, messageId: message.id }, 'attachment upload failed');
      }
    }
  }

  ticket.lastActivityAt = new Date();
  await ticketRepo.save(ticket);
  eventBus.emit(SupportTicketEvents.CUSTOMER_MESSAGE, { ticketId, messageId: message.id });

  if (ticket.agentState === 'human_handoff') {
    // Gate: do not dispatch to AI when derived to a human.
    return message;
  }
  if (!agentEnabled()) return message;

  triggerDispatch(ticketId);
  return message;
}

export async function addSupportHumanMessage(
  ticketId: string,
  userId: string,
  body: string,
): Promise<SupportTicketMessageEntity> {
  const ticket = await ticketRepo.findOne({ where: { id: ticketId } });
  if (!ticket) throw new NotFoundError('Ticket de soporte no encontrado');
  const message = await messageRepo.save(messageRepo.create({
    ticketId,
    senderRole: 'support',
    senderKind: 'user',
    senderUserId: userId,
    body,
    status: 'sent',
  }));
  ticket.lastActivityAt = new Date();
  await ticketRepo.save(ticket);
  return message;
}

// ─── Dispatch to AI agent ─────────────────────────────────────────

export function triggerDispatch(ticketId: string): void {
  if (dispatching.has(ticketId)) return;
  dispatching.add(ticketId);
  setImmediate(() => {
    void dispatchToAgent(ticketId)
      .catch((err) => logger.error({ err, ticketId }, 'agent dispatch crashed'))
      .finally(() => dispatching.delete(ticketId));
  });
}

async function dispatchToAgent(ticketId: string): Promise<void> {
  const ticket = await ticketRepo.findOne({ where: { id: ticketId } });
  if (!ticket) return;
  if (ticket.agentState === 'human_handoff') return;
  if (ticket.status === 'resolved') return;

  ticket.agentState = 'ai_working';
  ticket.lastActivityAt = new Date();
  await ticketRepo.save(ticket);

  let reply;
  try {
    const messages = await listMessages(ticketId);
    const conversation = await buildConversationForAgent(ticket, messages);
    reply = await generateSupportReply(
      {
        ticketTitle: ticket.title,
        ticketType: ticket.type,
        ticketNumber: ticket.ticketNumber != null ? String(ticket.ticketNumber) : null,
        appEnv: ticket.appEnv,
      },
      conversation,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await messageRepo.save(messageRepo.create({
      ticketId,
      senderRole: 'system',
      senderKind: 'system',
      body: 'Soporte automático no pudo responder. Podés reintentar o esperar a que un humano del equipo lo revise.',
      status: 'sent',
      metadata: { kind: 'agent_failed', error: msg },
    }));
    ticket.agentState = 'failed';
    ticket.lastActivityAt = new Date();
    await ticketRepo.save(ticket);
    eventBus.emit(SupportTicketEvents.AGENT_FAILED, { ticketId, error: msg });
    return;
  }

  await messageRepo.save(messageRepo.create({
    ticketId,
    senderRole: 'support',
    senderKind: 'ai',
    body: reply.visibleMessage,
    status: 'sent',
    metadata: { meta: reply.meta },
  }));

  await applyAgentMetadata(ticket, reply.meta);
  eventBus.emit(SupportTicketEvents.AGENT_REPLIED, { ticketId, meta: reply.meta });
}

async function applyAgentMetadata(ticket: SupportTicketEntity, meta: AgentMetadata): Promise<void> {
  const ticketId = ticket.id;
  let stateChanged = false;
  const prevStatus = ticket.status;

  if (meta.ticketStatus && meta.ticketStatus !== ticket.status) {
    ticket.status = meta.ticketStatus;
    if (meta.ticketStatus === 'resolved') {
      ticket.resolvedAt = new Date();
    }
    stateChanged = true;
  }

  const nextAgentState = meta.agentState ?? 'waiting_customer';
  if (nextAgentState !== ticket.agentState) {
    ticket.agentState = nextAgentState;
    stateChanged = true;
  }

  ticket.lastActivityAt = new Date();
  await ticketRepo.save(ticket);

  if (meta.ticketStatus && meta.ticketStatus !== prevStatus) {
    const label = STATUS_CHANGE_LABELS[meta.ticketStatus] ?? null;
    if (label) await addSystemMessage(ticketId, label, { statusFrom: prevStatus, statusTo: meta.ticketStatus });
  }

  if (nextAgentState === 'human_handoff') {
    const reason = meta.handoffReason ? ` Motivo: ${meta.handoffReason}` : '';
    await addSystemMessage(
      ticketId,
      `Derivé este caso a una persona del equipo de soporte.${reason}`,
      { kind: 'human_handoff', handoffReason: meta.handoffReason ?? null },
    );
  }
  if (meta.stateChangeMessage) {
    await addSystemMessage(ticketId, meta.stateChangeMessage, { kind: 'agent_state_change' });
  }

  if (stateChanged) {
    eventBus.emit(SupportTicketEvents.STATUS_CHANGED, { ticket, from: prevStatus, to: ticket.status });
  }
}

const STATUS_CHANGE_LABELS: Record<string, string> = {
  in_progress: 'El caso está siendo analizado.',
  review: 'El caso pasó a revisión.',
  resolved: 'Ticket resuelto.',
};

// ─── LLM message mapping ──────────────────────────────────────────

/**
 * Converts ERP messages into the OpenAI-compatible chat shape the AI SDK
 * expects. System messages stay in the UI timeline but are NOT sent to the
 * LLM — the agent already knows the ticket context via the system prompt.
 *
 * Attachments on a message are inlined at the end of that message's body
 * as signed URLs, so the agent can decide whether to fetch them.
 */
async function buildConversationForAgent(
  ticket: SupportTicketEntity,
  messages: SupportTicketMessageEntity[],
): Promise<ModelMessage[]> {
  const out: ModelMessage[] = [];

  const firstCustomer = messages.find((m) => m.senderRole === 'customer');
  if (!firstCustomer) {
    out.push({ role: 'user', content: await inlineAttachments(ticket.id, ticket.description, null) });
    return out;
  }

  for (const m of messages) {
    if (m.senderRole === 'system') continue;
    if (!m.body) continue;

    if (m.senderRole === 'customer') {
      out.push({ role: 'user', content: await inlineAttachments(ticket.id, m.body, m.id) });
    } else if (m.senderRole === 'support' && m.senderKind === 'ai') {
      out.push({ role: 'assistant', content: m.body });
    } else if (m.senderRole === 'support' && m.senderKind === 'user') {
      out.push({ role: 'user', content: `[Nota del equipo de soporte humano] ${m.body}` });
    }
  }
  return out;
}

async function inlineAttachments(
  ticketId: string,
  body: string,
  messageId: string | null,
): Promise<string> {
  if (!attachmentsEnabled()) return body;
  const where = messageId
    ? { ticketId, messageId }
    : { ticketId, messageId: undefined as unknown as null };
  const rows = await attachmentRepo.find({ where: where as any, order: { createdAt: 'ASC' } });
  if (rows.length === 0) return body;
  const lines: string[] = ['', `Adjuntos (${rows.length}):`];
  for (const r of rows) {
    try {
      const { url } = await getAttachmentSignedUrl(r.id);
      lines.push(`- ${r.fileName} (${r.mimeType}, ${r.sizeBytes} bytes): ${url}`);
    } catch {
      lines.push(`- ${r.fileName} (${r.mimeType}): [URL firmada no disponible]`);
    }
  }
  return `${body}\n${lines.join('\n')}`;
}

// ─── Exports for external callers ────────────────────────────────

export { agentEnabled, agentStatus };
