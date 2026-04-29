import { z } from 'zod';

export const CreateDriverSchema = z.object({
  userId: z.string().min(3).max(40).optional(),
  fullName: z.string().min(1),
  dni: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseExpires: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const UpdateDriverSchema = CreateDriverSchema.partial();
