import { z } from 'zod';

const InvoiceItemSchema = z.object({
  productId: z.string().min(3).max(40),
  description: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discountPct: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).optional(),
});

export const CreateInvoiceSchema = z.object({
  orderId: z.string().min(3).max(40).optional(),
  typeId: z.string().min(3).max(40).optional(),
  customerId: z.string().min(3).max(40),
  subtotal: z.number().min(0).optional(),
  taxes: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  notes: z.string().optional(),
  invoiceType: z.enum(['A', 'B', 'C', 'E', 'M']).optional(),
  salesPoint: z.union([z.string(), z.number()]).optional().transform((v) => v === undefined ? undefined : String(v)),
  jurisdictionId: z.string().min(3).max(40).nullable().optional(),
  deliveryNoteId: z.string().min(3).max(40).nullable().optional(),
  shipmentStopId: z.string().min(3).max(40).nullable().optional(),
  originalInvoiceId: z.string().min(3).max(40).nullable().optional(),
  items: z.array(InvoiceItemSchema).optional(),
});

export const UpdateInvoiceSchema = z.object({
  notes: z.string().optional(),
  invoiceType: z.enum(['A', 'B', 'C', 'E', 'M']).optional(),
  salesPoint: z.union([z.string(), z.number()]).optional().transform((v) => v === undefined ? undefined : String(v)),
  jurisdictionId: z.string().min(3).max(40).nullable().optional(),
});
