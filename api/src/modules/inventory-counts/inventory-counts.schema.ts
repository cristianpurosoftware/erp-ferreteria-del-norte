import { z } from 'zod';

export const CreateInventoryCountSchema = z.object({
  warehouseId: z.string().min(3).max(40),
  kind: z.enum(['cycle', 'full', 'spot']).optional(),
  scope: z.record(z.any()).optional(),
});

export const AddLinesSchema = z.object({
  lines: z.array(z.object({
    productId: z.string().min(3).max(40),
    lotId: z.string().min(3).max(40).optional(),
    locationId: z.string().min(3).max(40).optional(),
    systemQty: z.number().optional(),
    countedQty: z.number().optional(),
    reasonCode: z.string().optional(),
  })).min(1),
});
