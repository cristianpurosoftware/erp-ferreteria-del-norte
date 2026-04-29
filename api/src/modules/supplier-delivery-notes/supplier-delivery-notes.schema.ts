import { z } from 'zod';

export const CreateSupplierDeliveryNoteSchema = z.object({
  supplierId: z.string().min(3).max(40),
  supplierDeliveryNoteNumber: z.string().min(1),
  purchaseOrderId: z.string().min(3).max(40).optional(),
  warehouseId: z.string().min(3).max(40),
});

export const UpdateSupplierDeliveryNoteSchema = CreateSupplierDeliveryNoteSchema.partial();
