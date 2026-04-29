import { z } from 'zod';

const PaymentLineSchema = z.object({
  method: z.enum(['cash', 'card', 'transfer', 'account']),
  amount: z.number().positive(),
});

const SaleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  discount: z.number().min(0).optional().default(0),
  tax: z.number().min(0).optional().default(0),
});

export const CreatePosSaleSchema = z.object({
  warehouseId: z.string().min(1),
  customerId: z.string().min(1).optional().nullable(),
  items: z.array(SaleItemSchema).min(1),
  payments: z.array(PaymentLineSchema).min(1),
  notes: z.string().optional(),
});

export type CreatePosSaleInput = z.infer<typeof CreatePosSaleSchema>;
