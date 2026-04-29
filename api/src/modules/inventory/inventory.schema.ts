import { z } from 'zod';

export const CreateMovementSchema = z.object({
  type: z.enum(['inbound', 'outbound', 'adjustment', 'transfer', 'reservation', 'release', 'return']),
  productId: z.string().min(3).max(40),
  variantId: z.string().min(3).max(40).nullable().optional(),
  sourceWarehouseId: z.string().min(3).max(40).nullable().optional(),
  destWarehouseId: z.string().min(3).max(40).nullable().optional(),
  quantity: z.number().positive(),
  reason: z.string().nullable().optional(),
  referenceType: z.string().nullable().optional(),
  referenceId: z.string().nullable().optional(),
});

export const AdjustStockSchema = z.object({
  productId: z.string().min(3).max(40),
  variantId: z.string().min(3).max(40).nullable().optional(),
  warehouseId: z.string().min(3).max(40),
  quantity: z.number(),
  reason: z.string().optional(),
});

export const TransferSchema = z.object({
  productId: z.string().min(3).max(40),
  variantId: z.string().min(3).max(40).nullable().optional(),
  sourceWarehouseId: z.string().min(3).max(40),
  destWarehouseId: z.string().min(3).max(40),
  quantity: z.number().positive(),
});
