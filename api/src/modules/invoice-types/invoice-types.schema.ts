import { z } from 'zod';

export const CreateInvoiceTypeSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
});

export const UpdateInvoiceTypeSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
});
