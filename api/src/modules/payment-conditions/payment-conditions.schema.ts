import { z } from 'zod';

export const CreatePaymentConditionSchema = z.object({
  name: z.string().min(1),
  days: z.number().int().min(0),
  description: z.string().optional(),
});

export const UpdatePaymentConditionSchema = z.object({
  name: z.string().min(1).optional(),
  days: z.number().int().min(0).optional(),
  description: z.string().optional(),
});
