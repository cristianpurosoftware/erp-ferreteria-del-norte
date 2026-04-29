import { z } from 'zod';

export const CreateSupplierInvoiceSchema = z.object({
  supplierId: z.string().min(3).max(40),
  invoiceType: z.enum(['A', 'B', 'C', 'E']).optional(),
  supplierInvoiceNumber: z.string().min(1),
  salesPoint: z.string().optional(),
  issueDate: z.string(),
  receptionDate: z.string().optional(),
  dueDate: z.string().optional(),
  currency: z.string().optional(),
  perceptions: z.number().optional(),
  cae: z.string().optional(),
  caeExpiration: z.string().optional(),
  purchaseOrderId: z.string().min(3).max(40).optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(3).max(40).optional(),
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitCost: z.number().min(0),
    discount: z.number().min(0).optional(),
    tax: z.number().min(0).optional(),
    purchaseOrderItemId: z.string().min(3).max(40).optional(),
    receptionItemId: z.string().min(3).max(40).optional(),
  })).min(1),
});

export const UpdateSupplierInvoiceSchema = CreateSupplierInvoiceSchema.partial().omit({ items: true });
