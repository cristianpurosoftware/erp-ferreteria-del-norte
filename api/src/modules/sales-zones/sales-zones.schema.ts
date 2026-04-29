import { z } from 'zod';

export const CreateSalesZoneSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1),
  description: z.string().optional(),
  parentZoneId: z.string().min(3).max(40).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const UpdateSalesZoneSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  parentZoneId: z.string().min(3).max(40).nullable().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
