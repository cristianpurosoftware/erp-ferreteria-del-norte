import { z } from "zod";

export const orderItemSchema = z.object({
  productId: z.string().min(1, "Producto requerido"),
  variantId: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "Cantidad mínima: 1"),
  unitPrice: z.coerce.number().min(0, "Precio inválido"),
  discount: z.coerce.number().min(0).default(0),
  tax: z.coerce.number().min(0).default(0),
});

export const orderSchema = z.object({
  customerId: z.string().min(1, "Cliente requerido"),
  branchId: z.string().optional(),
  sellerId: z.string().optional(),
  channel: z.string().optional(),
  estimatedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Debe agregar al menos un producto"),
  // Fase 1 — Comercial
  zoneId: z.string().uuid().optional(),
  routeId: z.string().uuid().optional(),
  operationType: z
    .enum(["sale", "sample", "donation", "internal"])
    .default("sale"),
  promotionId: z.string().uuid().optional(),
});

export type OrderFormValues = z.infer<typeof orderSchema>;
export type OrderItemFormValues = z.infer<typeof orderItemSchema>;
