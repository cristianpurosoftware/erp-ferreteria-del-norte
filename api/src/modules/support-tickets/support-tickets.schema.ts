import { z } from 'zod';

export const SUPPORT_TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const SUPPORT_TICKET_TYPES = ['bug', 'question', 'change'] as const;
export const SUPPORT_TICKET_AGENT_STATES = [
  'idle',
  'ai_working',
  'waiting_customer',
  'awaiting_review',
  'human_handoff',
  'resolved',
  'failed',
] as const;

export const SUPPORT_MESSAGE_SENDER_ROLES = ['customer', 'support', 'system'] as const;
export const SUPPORT_MESSAGE_SENDER_KINDS = ['user', 'ai', 'system'] as const;

const AppEnvSchema = z.string().trim().min(1).max(50);

export const CreateSupportTicketSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000),
  type: z.enum(SUPPORT_TICKET_TYPES),
  priority: z.enum(SUPPORT_TICKET_PRIORITIES).optional(),
  appEnv: AppEnvSchema.optional(),
});

export const UpdateSupportTicketSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(10000).optional(),
  type: z.enum(SUPPORT_TICKET_TYPES).optional(),
  priority: z.enum(SUPPORT_TICKET_PRIORITIES).optional(),
  appEnv: AppEnvSchema.nullable().optional(),
});

export const ChatMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

export const AgentActionNoteSchema = z.object({
  note: z.string().trim().max(5000).optional(),
});
