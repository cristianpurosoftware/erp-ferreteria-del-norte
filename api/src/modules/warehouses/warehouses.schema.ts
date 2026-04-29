import { z } from 'zod';

export const CreateWarehouseSchema = z.object({
  branchId: z.string().min(3).max(40),
  name: z.string().min(1),
  type: z.enum(['physical', 'virtual']).optional(),
});

export const UpdateWarehouseSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['physical', 'virtual']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
