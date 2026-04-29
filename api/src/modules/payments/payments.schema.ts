import { z } from 'zod';

export const CreatePaymentSchema = z.object({
  type: z.enum(['collection', 'payment_out']),
  customerId: z.string().min(3).max(40).optional(),
  supplierId: z.string().min(3).max(40).optional(),
  paymentMethod: z.enum(['cash', 'transfer', 'card', 'check', 'other']),
  amount: z.number().positive(),
  currency: z.string().optional(),
  externalReference: z.string().optional(),
  notes: z.string().optional(),
});
