import { z } from 'zod';

export const CreateCategorySchema = z.object({
  name: z.string().min(1),
  parentId: z.string().min(3).max(40).nullable().optional(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  parentId: z.string().min(3).max(40).nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
