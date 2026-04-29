import { z } from 'zod';

export const CreateDebitNoteSchema = z.object({
  customerId: z.string().min(3).max(40),
  originalInvoiceId: z.string().min(3).max(40),
  invoiceType: z.enum(['A', 'B', 'C']).optional(),
  salesPoint: z.string().optional(),
  issueDate: z.string().optional(),
  jurisdictionId: z.string().min(3).max(40).optional(),
  reason: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(3).max(40).optional(),
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    discount: z.number().optional(),
    tax: z.number().optional(),
  })).min(1),
});
