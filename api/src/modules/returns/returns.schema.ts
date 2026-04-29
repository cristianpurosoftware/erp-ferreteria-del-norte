import { z } from 'zod';

const Kinds = ['not_delivered', 'rejected_by_customer', 'damaged', 'expired', 'commercial'] as const;
const Conditions = ['resellable', 'damaged', 'expired', 'quarantine'] as const;

export const CreateReturnSchema = z.object({
  customerId: z.string().min(3).max(40),
  shipmentId: z.string().min(3).max(40).optional(),
  shipmentStopId: z.string().min(3).max(40).optional(),
  originalOrderId: z.string().min(3).max(40).optional(),
  warehouseId: z.string().min(3).max(40).optional(),
  kind: z.enum(Kinds).optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(3).max(40),
    lotId: z.string().min(3).max(40).optional(),
    quantity: z.number().positive(),
    reasonCode: z.string().optional(),
    condition: z.enum(Conditions).optional(),
  })).optional(),
});

export const InspectItemsSchema = z.object({
  lines: z.array(z.object({
    itemId: z.string().min(3).max(40),
    condition: z.enum(Conditions),
    destLocationId: z.string().min(3).max(40).optional(),
  })).min(1),
});
