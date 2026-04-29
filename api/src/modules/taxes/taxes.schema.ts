import { z } from 'zod';

export const CreateTaxSchema = z.object({
  name: z.string().min(1),
  rate: z.number().min(0).max(100),
  isDefault: z.boolean().optional(),
});

export const UpdateTaxSchema = z.object({
  name: z.string().min(1).optional(),
  rate: z.number().min(0).max(100).optional(),
  isDefault: z.boolean().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
