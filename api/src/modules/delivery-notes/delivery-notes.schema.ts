import { z } from 'zod';

export const CreateDeliveryNoteSchema = z.object({
  number: z.string().min(1),
  salesPoint: z.string().optional(),
  invoiceType: z.enum(['X', 'R']).optional(),
  issueDate: z.string(),
  customerId: z.string().min(3).max(40),
  orderId: z.string().min(3).max(40).optional(),
  shipmentStopId: z.string().min(3).max(40).optional(),
  warehouseId: z.string().min(3).max(40).optional(),
  driverId: z.string().min(3).max(40).optional(),
  vehicleId: z.string().min(3).max(40).optional(),
  items: z.array(z.object({
    productId: z.string().min(3).max(40),
    lotId: z.string().min(3).max(40).optional(),
    orderItemId: z.string().min(3).max(40).optional(),
    quantity: z.number().positive(),
    unitPrice: z.number().optional(),
  })).min(1),
});

export const UpdateDeliveryNoteSchema = z.object({
  number: z.string().optional(),
  warehouseId: z.string().min(3).max(40).optional(),
  driverId: z.string().min(3).max(40).optional(),
  vehicleId: z.string().min(3).max(40).optional(),
}).passthrough();
