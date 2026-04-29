import { z } from 'zod';

const PromotionKinds = ['discount_pct', 'discount_amount', 'nx+m', 'combo', 'price_override'] as const;

export const CreatePromotionSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(PromotionKinds),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  channel: z.string().optional(),
  customerCategory: z.enum(['A', 'B', 'C']).optional(),
  zoneId: z.string().min(3).max(40).optional(),
  minQty: z.number().int().min(1).optional(),
  priority: z.number().int().optional(),
});

export const UpdatePromotionSchema = CreatePromotionSchema.partial().omit({ code: true });

export const AddPromotionItemSchema = z.object({
  productId: z.string().min(3).max(40).optional(),
  categoryId: z.string().min(3).max(40).optional(),
  discountPct: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  buyQty: z.number().int().positive().optional(),
  getQty: z.number().int().positive().optional(),
  overridePrice: z.number().min(0).optional(),
}).refine((v) => v.productId || v.categoryId, { message: 'Se requiere productId o categoryId' });
