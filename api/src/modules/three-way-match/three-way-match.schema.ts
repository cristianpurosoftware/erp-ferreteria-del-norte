import { z } from 'zod';

export const OverrideMatchSchema = z.object({
  reason: z.string().min(1),
  notes: z.string().optional(),
});
