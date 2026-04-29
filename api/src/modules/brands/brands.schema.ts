import { z } from 'zod';

export const CreateBrandSchema = z.object({
  name: z.string().min(1),
});

export const UpdateBrandSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
