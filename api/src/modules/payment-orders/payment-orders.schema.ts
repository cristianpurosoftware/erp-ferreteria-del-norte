import { z } from 'zod';

export const CreatePaymentOrderSchema = z.object({
  supplierId: z.string().min(3).max(40),
  date: z.string(),
  currency: z.string().optional(),
  total: z.number().min(0),
  notes: z.string().optional(),
});

export const CreatePaymentBatchSchema = z.object({
  bankAccountId: z.string().min(3).max(40),
  date: z.string(),
});
