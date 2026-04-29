import { z } from 'zod';

export const CreatePaymentMethodSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  status: z.enum(['active', 'inactive']).optional(),
  description: z.string().optional(),
});

export const UpdatePaymentMethodSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  description: z.string().optional(),
});
