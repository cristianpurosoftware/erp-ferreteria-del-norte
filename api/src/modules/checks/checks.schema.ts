import { z } from 'zod';

export const CreateCheckSchema = z.object({
  number: z.string().min(1),
  bankName: z.string().min(1),
  branch: z.string().optional(),
  accountHolder: z.string().min(1),
  cuit: z.string().optional(),
  amount: z.number().positive(),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  kind: z.enum(['common', 'deferred']).optional(),
  ownOrThird: z.enum(['own', 'third']).optional(),
  receivedFromCustomerId: z.string().min(3).max(40).optional(),
});

export const DepositCheckSchema = z.object({ bankAccountId: z.string().min(3).max(40) });
export const BounceCheckSchema = z.object({ reason: z.string().min(1) });
export const EndorseCheckSchema = z.object({ supplierId: z.string().min(3).max(40) });
