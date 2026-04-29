import { z } from 'zod';

const PurchaseOrderItemSchema = z.object({
  productId: z.string().min(3).max(40),
  quantity: z.number().positive(),
  unitCost: z.number().positive(),
});

export const CreatePurchaseOrderSchema = z.object({
  supplierId: z.string().min(3).max(40),
  branchId: z.string().min(3).max(40).optional(),
  notes: z.string().optional(),
  items: z.array(PurchaseOrderItemSchema).min(1),
});

export const UpdatePurchaseOrderSchema = z.object({
  supplierId: z.string().min(3).max(40).optional(),
  branchId: z.string().min(3).max(40).nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(PurchaseOrderItemSchema).min(1),
});

export const CreateReceptionSchema = z.object({
  warehouseId: z.string().min(3).max(40),
  notes: z.string().optional(),
});
