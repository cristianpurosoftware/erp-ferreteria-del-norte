import { AppDataSource } from '../../config/data-source';
import { SupportTicketEntity } from './data_access/support-ticket.entity';
import { SupportTicketMessageEntity } from './data_access/support-ticket-message.entity';
import { SupportTicketAttachmentEntity } from './data_access/support-ticket-attachment.entity';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import { assertTransition, TransitionMap } from '../../common/state-machine';
import { getContext } from '../../common/request-context';
import eventBus from '../../common/event-bus';
import { SupportTicketEvents } from './support-tickets.events';
import * as chat from './support-chat.service';
import * as attachmentsService from './support-attachments.service';
import { logger } from '../../common/logger';

const ticketRepo = AppDataSource.getRepository(SupportTicketEntity);
const messageRepo = AppDataSource.getRepository(SupportTicketMessageEntity);
const attachmentRepo = AppDataSource.getRepository(SupportTicketAttachmentEntity);

const TRANSITIONS: TransitionMap<string> = {
  created: ['in_progress'],
  in_progress: ['review', 'resolved'],
  review: ['resolved', 'in_progress'],
  resolved: [],
};

const ELEVATED_TRANSITIONS: Array<{ from: string; to: string }> = [
  { from: 'review', to: 'resolved' },
  { from: 'review', to: 'in_progress' },
  { from: 'in_progress', to: 'resolved' },
];

const COLUMNS: ColumnMap = {
  title:           { type: 'string', column: 'title' },
  type:            { type: 'enum',   column: 'type' },
  status:          { type: 'enum',   column: 'status' },
  agentState:      { type: 'enum',   column: 'agentState' },
  priority:        { type: 'enum',   column: 'priority' },
  appEnv:          { type: 'enum',   column: 'appEnv' },
  createdByUserId: { type: 'enum',   column: 'createdByUserId' },
  resolvedByUserId:{ type: 'enum',   column: 'resolvedByUserId' },
  ticketNumber:    { type: 'number', column: 'ticketNumber' },
  createdAt:       { type: 'date',   column: 'createdAt' },
  lastActivityAt:  { type: 'date',   column: 'lastActivityAt' },
  resolvedAt:      { type: 'date',   column: 'resolvedAt' },
};

const SORTABLE: SortableMap = [
  'ticketNumber', 'title', 'type', 'status', 'priority', 'appEnv',
  'createdAt', 'lastActivityAt', 'resolvedAt',
];

const SEARCH = ['title', 'description'];

function currentUserId(): string {
  const ctx = getContext();
  if (!ctx?.userId) {
    throw new BusinessLogicError(
      'NO_AUTH_CONTEXT',
      'No hay usuario autenticado en el contexto de la solicitud',
    );
  }
  return ctx.userId;
}

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = ticketRepo.createQueryBuilder('t');
  query.applyTo(qb, 't', COLUMNS, SORTABLE, SEARCH, {
    field: 'lastActivityAt', direction: 'DESC',
  });
  const [items, total] = await qb.getManyAndCount();
  return { items, meta: query.buildMeta(total) };
}

export async function findSummary(req: Record<string, unknown>) {
  const query = new ListQuery(req);

  const totalsQb = ticketRepo.createQueryBuilder('t').select('COUNT(t.id)', 'total');
  query.applyFilters(totalsQb, 't', COLUMNS, SEARCH);
  const totals = await totalsQb.getRawOne();

  const byStatusQb = ticketRepo.createQueryBuilder('t')
    .select('t.status', 'status')
    .addSelect('COUNT(t.id)', 'count')
    .groupBy('t.status');
  query.applyFilters(byStatusQb, 't', COLUMNS, SEARCH);
  const byStatusRows = await byStatusQb.getRawMany();

  const byPriorityQb = ticketRepo.createQueryBuilder('t')
    .select('t.priority', 'priority')
    .addSelect('COUNT(t.id)', 'count')
    .groupBy('t.priority');
  query.applyFilters(byPriorityQb, 't', COLUMNS, SEARCH);
  const byPriorityRows = await byPriorityQb.getRawMany();

  return {
    total: Number(totals?.total ?? 0),
    byStatus: byStatusRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = Number(r.count); return acc;
    }, {}),
    byPriority: byPriorityRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.priority] = Number(r.count); return acc;
    }, {}),
  };
}

export async function findById(id: string) {
  const ticket = await ticketRepo.findOne({ where: { id } });
  if (!ticket) throw new NotFoundError('Ticket de soporte no encontrado');
  const [messages, attachments] = await Promise.all([
    messageRepo.find({ where: { ticketId: id }, order: { createdAt: 'ASC' } }),
    attachmentRepo.find({ where: { ticketId: id }, order: { createdAt: 'ASC' } }),
  ]);
  return { ...ticket, messages, attachments };
}

type AttachmentFile = { originalname: string; mimetype: string; size: number; buffer: Buffer };

export async function create(
  data: {
    title: string;
    description: string;
    type: string;
    priority?: string;
    appEnv?: string;
  },
  attachments: AttachmentFile[] | undefined,
  userIdOverride?: string,
) {
  const userId = userIdOverride ?? currentUserId();
  const now = new Date();
  const willDispatch = chat.agentEnabled();
  const ticket = ticketRepo.create({
    title: data.title,
    description: data.description,
    type: data.type,
    priority: data.priority ?? 'normal',
    appEnv: data.appEnv ?? null,
    status: willDispatch ? 'in_progress' : 'created',
    agentState: willDispatch ? 'ai_working' : 'idle',
    createdByUserId: userId,
    lastActivityAt: now,
  });
  const saved = await ticketRepo.save(ticket);
  logger.info({ action: 'create', ticketId: saved.id, type: saved.type, priority: saved.priority, createdByUserId: userId }, 'Support ticket created');
  eventBus.emit(SupportTicketEvents.CREATED, saved);

  // First customer message carries the ticket description + any attachments.
  const firstMessage = await chat.addCustomerMessage(
    saved.id,
    userId,
    data.description,
    attachments,
  );

  // System message confirming the ticket was opened.
  const status = chat.agentStatus();
  const openedMsg = status.configured
    ? 'Ticket creado. Soporte lo está analizando.'
    : 'Ticket creado. Soporte automático no está disponible en este ambiente, un humano del equipo lo revisará.';
  await chat.addSystemMessage(saved.id, openedMsg, {
    kind: 'ticket_opened',
    agentConfigured: status.configured,
  });

  // If Hermes isn't configured we can't dispatch; the create flow already
  // skips the dispatch inside `addCustomerMessage`, but we still want the
  // ticket to sit in `created` rather than `ai_working`.
  if (!status.configured) {
    const fresh = await ticketRepo.findOne({ where: { id: saved.id } });
    if (fresh) {
      fresh.agentState = 'idle';
      fresh.status = 'created';
      await ticketRepo.save(fresh);
    }
  }

  return findById(saved.id);
}

export async function update(
  id: string,
  data: Partial<{ title: string; description: string; type: string; priority: string; appEnv: string | null }>,
) {
  const ticket = await ticketRepo.findOne({ where: { id } });
  if (!ticket) throw new NotFoundError('Ticket de soporte no encontrado');
  if (ticket.status === 'resolved') {
    throw new BusinessLogicError(
      'TICKET_RESOLVED',
      'No se puede modificar un ticket resuelto',
    );
  }

  const changes: Record<string, { from: any; to: any }> = {};
  let priorityChanged = false;
  for (const k of ['title', 'description', 'type', 'priority', 'appEnv'] as const) {
    if (data[k] !== undefined && data[k] !== (ticket as any)[k]) {
      changes[k] = { from: (ticket as any)[k], to: data[k] };
      (ticket as any)[k] = data[k];
      if (k === 'priority') priorityChanged = true;
    }
  }
  if (Object.keys(changes).length === 0) return findById(id);

  ticket.lastActivityAt = new Date();
  const saved = await ticketRepo.save(ticket);

  logger.info({ action: 'update', ticketId: id }, 'Support ticket updated');
  eventBus.emit(SupportTicketEvents.UPDATED, saved);
  if (priorityChanged) eventBus.emit(SupportTicketEvents.PRIORITY_CHANGED, saved);
  return findById(saved.id);
}

export function transitionRequiresElevatedPermission(from: string, to: string): boolean {
  return ELEVATED_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export async function sendCustomerMessage(
  ticketId: string,
  body: string,
  files: AttachmentFile[] | undefined,
  userIdOverride?: string,
) {
  const userId = userIdOverride ?? currentUserId();
  await chat.addCustomerMessage(ticketId, userId, body, files);
  return findById(ticketId);
}

export async function sendSupportHumanMessage(
  ticketId: string,
  body: string,
  userIdOverride?: string,
) {
  const userId = userIdOverride ?? currentUserId();
  await chat.addSupportHumanMessage(ticketId, userId, body);
  return findById(ticketId);
}

export async function escalateToHuman(ticketId: string, note?: string) {
  const ticket = await ticketRepo.findOne({ where: { id: ticketId } });
  if (!ticket) throw new NotFoundError('Ticket de soporte no encontrado');
  const from = ticket.agentState;
  ticket.agentState = 'human_handoff';
  ticket.lastActivityAt = new Date();
  await ticketRepo.save(ticket);
  logger.info({ action: 'transition', ticketId, from, to: 'human_handoff' }, 'Support ticket escalated to human');
  const suffix = note ? ` Nota: ${note}` : '';
  await chat.addSystemMessage(
    ticketId,
    `El caso fue derivado a una persona del equipo de soporte.${suffix}`,
    { kind: 'human_handoff', note: note ?? null },
  );
  eventBus.emit(SupportTicketEvents.HANDED_OFF_TO_HUMAN, { ticketId, note });
  return findById(ticketId);
}

export async function returnToAgent(ticketId: string, note?: string) {
  const ticket = await ticketRepo.findOne({ where: { id: ticketId } });
  if (!ticket) throw new NotFoundError('Ticket de soporte no encontrado');
  if (!chat.agentEnabled()) {
    throw new BusinessLogicError(
      'AGENT_DISABLED',
      'Soporte automático no está disponible en este ambiente',
    );
  }
  const from = ticket.agentState;
  const suffix = note ? ` Nota: ${note}` : '';
  await chat.addSystemMessage(
    ticketId,
    `El caso fue devuelto a soporte automático para seguir analizando.${suffix}`,
    { kind: 'returned_to_agent', note: note ?? null },
  );
  ticket.agentState = 'ai_working';
  ticket.lastActivityAt = new Date();
  await ticketRepo.save(ticket);
  logger.info({ action: 'transition', ticketId, from, to: 'ai_working' }, 'Support ticket returned to agent');
  eventBus.emit(SupportTicketEvents.RETURNED_TO_AGENT, { ticketId, note });
  chat.triggerDispatch(ticketId);
  return findById(ticketId);
}

export async function reopen(ticketId: string) {
  const ticket = await ticketRepo.findOne({ where: { id: ticketId } });
  if (!ticket) throw new NotFoundError('Ticket de soporte no encontrado');
  if (ticket.status !== 'resolved') {
    throw new BusinessLogicError('NOT_RESOLVED', 'Solo se pueden reabrir tickets resueltos');
  }
  const wasHandoff = ticket.agentState === 'human_handoff' || ticket.agentState === 'resolved';
  const from = ticket.status;
  ticket.status = 'in_progress';
  ticket.agentState = wasHandoff ? 'human_handoff' : (chat.agentEnabled() ? 'ai_working' : 'idle');
  ticket.resolvedAt = null;
  ticket.resolvedByUserId = null;
  ticket.lastActivityAt = new Date();
  const saved = await ticketRepo.save(ticket);
  logger.info({ action: 'transition', ticketId, from, to: 'in_progress' }, 'Support ticket reopened');
  await chat.addSystemMessage(
    ticketId,
    'Ticket reabierto.',
    { kind: 'ticket_reopened', priorAgentState: ticket.agentState },
  );
  eventBus.emit(SupportTicketEvents.REOPENED, saved);
  if (!wasHandoff && chat.agentEnabled()) chat.triggerDispatch(ticketId);
  return findById(ticketId);
}

export async function transition(id: string, to: string, note?: string, userPermissions: string[] = []) {
  const ticket = await ticketRepo.findOne({ where: { id } });
  if (!ticket) throw new NotFoundError('Ticket de soporte no encontrado');

  const from = ticket.status;
  assertTransition(TRANSITIONS, from, to, 'support_ticket');

  if (transitionRequiresElevatedPermission(from, to) &&
      !userPermissions.includes('support_tickets:resolve')) {
    throw new BusinessLogicError(
      'INSUFFICIENT_PERMISSION',
      `Esta transición requiere permiso 'support_tickets:resolve'`,
    );
  }

  ticket.status = to;
  ticket.lastActivityAt = new Date();
  if (to === 'resolved') {
    ticket.resolvedByUserId = currentUserId();
    ticket.resolvedAt = new Date();
    ticket.agentState = 'resolved';
  } else if (from === 'resolved') {
    ticket.resolvedByUserId = null;
    ticket.resolvedAt = null;
  }
  const saved = await ticketRepo.save(ticket);
  logger.info({ action: 'transition', ticketId: id, from, to }, 'Support ticket status changed');

  const label = STATUS_TO_SYSTEM_LABEL[to];
  if (label) {
    const body = note ? `${label} Nota: ${note}` : label;
    await chat.addSystemMessage(id, body, { kind: 'status_changed', from, to, note: note ?? null });
  }
  eventBus.emit(SupportTicketEvents.STATUS_CHANGED, { ticket: saved, from, to });
  if (to === 'resolved') eventBus.emit(SupportTicketEvents.RESOLVED, saved);
  return findById(saved.id);
}

const STATUS_TO_SYSTEM_LABEL: Record<string, string> = {
  in_progress: 'El ticket volvió a estar en progreso.',
  review: 'El ticket pasó a revisión.',
  resolved: 'Ticket resuelto.',
};

// Called by the attachments controller when a standalone file is uploaded
// (not tied to a message). We skip the legacy event here — the upload itself
// creates the DB row, and the UI pulls attachments separately.
export { attachmentsService as _attachmentsService };
