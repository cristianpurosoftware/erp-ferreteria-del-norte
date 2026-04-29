import { z } from 'zod';

export const CreateUnitSchema = z.object({
  name: z.string().min(1),
  abbreviation: z.string().min(1),
  type: z.enum(['weight', 'volume', 'count', 'length']),
});

export const UpdateUnitSchema = z.object({
  name: z.string().min(1).optional(),
  abbreviation: z.string().min(1).optional(),
  type: z.enum(['weight', 'volume', 'count', 'length']).optional(),
});
