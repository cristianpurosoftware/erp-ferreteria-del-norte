import { z } from 'zod';

export const CreatePriceListSchema = z.object({
  name: z.string().min(1),
  currency: z.string().min(1).optional(),
  validFrom: z.string().date().optional(),
  validUntil: z.string().date().optional(),
  isDefault: z.boolean().optional(),
});

export const UpdatePriceListSchema = z.object({
  name: z.string().min(1).optional(),
  currency: z.string().min(1).optional(),
  validFrom: z.string().date().nullable().optional(),
  validUntil: z.string().date().nullable().optional(),
  isDefault: z.boolean().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const AddPriceListItemSchema = z.object({
  productId: z.string().min(3).max(40),
  price: z.number().min(0),
  minQuantity: z.number().int().min(1).optional(),
});
