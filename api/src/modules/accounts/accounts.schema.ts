import { z } from 'zod';

export const CreateAccountEntrySchema = z.object({
  accountId: z.string().min(3).max(40).optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  type: z.enum(['debit', 'credit']),
  concept: z.string().min(1),
  amount: z.number().positive(),
  referenceType: z.enum(['order', 'invoice', 'payment']).optional(),
  referenceId: z.string().optional(),
}).refine(
  (data) => data.accountId || (data.entityType && data.entityId),
  { message: 'Se requiere accountId, o bien entityType y entityId juntos' },
);
