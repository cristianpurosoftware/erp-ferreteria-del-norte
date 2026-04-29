import { z } from 'zod';

export const ConfirmMatchSchema = z.object({
  bankStatementLineId: z.string().min(3).max(40),
  paymentId: z.string().min(3).max(40).optional(),
  checkId: z.string().min(3).max(40).optional(),
  amount: z.number().positive(),
}).refine((v) => v.paymentId || v.checkId, { message: 'Se requiere paymentId o checkId' });
