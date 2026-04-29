import { z } from 'zod';

export const CreateLotSchema = z.object({
  productId: z.string().min(3).max(40),
  code: z.string().min(1),
  manufactureDate: z.string().optional(),
  expirationDate: z.string().optional(),
  supplierId: z.string().min(3).max(40).optional(),
  receivedAt: z.string().optional(),
});

export const UpdateLotSchema = z.object({
  manufactureDate: z.string().optional(),
  expirationDate: z.string().optional(),
  supplierId: z.string().min(3).max(40).nullable().optional(),
}).passthrough();
