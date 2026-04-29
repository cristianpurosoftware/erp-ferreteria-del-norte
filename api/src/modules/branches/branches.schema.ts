import { z } from 'zod';

export const CreateBranchSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export const UpdateBranchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
