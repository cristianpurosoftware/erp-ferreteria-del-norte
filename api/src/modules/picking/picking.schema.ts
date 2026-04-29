import { z } from 'zod';

export const CreatePickingTaskSchema = z.object({
  orderId: z.string().min(3).max(40).optional(),
  shipmentId: z.string().min(3).max(40).optional(),
  warehouseId: z.string().min(3).max(40),
  assignedTo: z.string().min(3).max(40).optional(),
  priority: z.number().int().optional(),
  items: z.array(z.object({
    orderItemId: z.string().min(3).max(40).optional(),
    productId: z.string().min(3).max(40),
    lotId: z.string().min(3).max(40).optional(),
    sourceLocationId: z.string().min(3).max(40).optional(),
    requestedQty: z.number().positive(),
  })).optional(),
});

export const AssignPickingTaskSchema = z.object({ userId: z.string().min(3).max(40) });

export const PickItemSchema = z.object({
  pickedQty: z.number().min(0),
  lotId: z.string().min(3).max(40).optional(),
  locationId: z.string().min(3).max(40).optional(),
  short: z.boolean().optional(),
});
