import { z } from "zod";

export const promotionSchema = z.object({
  code: z.string().min(1, "Código requerido"),
  name: z.string().min(1, "Nombre requerido"),
  kind: z.enum([
    "discount_pct",
    "discount_amount",
    "nx+m",
    "combo",
    "price_override",
  ]),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  channel: z.string().optional(),
  customerCategory: z.enum(["A", "B", "C"]).optional(),
  zoneId: z.string().uuid().optional(),
  minQty: z.coerce.number().int().min(1).optional(),
  priority: z.coerce.number().int().default(0),
});

export type PromotionFormValues = z.infer<typeof promotionSchema>;

export const promotionItemSchema = z
  .object({
    productId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    discountPct: z.coerce.number().min(0).max(100).optional(),
    discountAmount: z.coerce.number().min(0).optional(),
    buyQty: z.coerce.number().int().positive().optional(),
    getQty: z.coerce.number().int().positive().optional(),
    overridePrice: z.coerce.number().min(0).optional(),
  })
  .refine((v) => v.productId || v.categoryId, {
    message: "Producto o categoría requerida",
    path: ["productId"],
  });

export type PromotionItemFormValues = z.infer<typeof promotionItemSchema>;
