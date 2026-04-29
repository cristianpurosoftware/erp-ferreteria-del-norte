import { z } from 'zod';

const OrderItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().positive(),
  // unitPrice is optional: if omitted, the server resolves it from the
  // customer's price list. If provided and different from the list price,
  // the caller needs `orders:override_price`.
  unitPrice: z.number().positive().optional(),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
});

export const CreateOrderSchema = z.object({
  customerId: z.string().min(3).max(40),
  branchId: z.string().min(3).max(40).optional(),
  sellerId: z.string().min(3).max(40).optional(),
  channel: z.string().optional(),
  estimatedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(OrderItemSchema).min(1),
});

export const UpdateOrderSchema = z.object({
  notes: z.string().optional(),
  estimatedDeliveryDate: z.string().optional(),
  items: z.array(OrderItemSchema).min(1).optional(),
});
