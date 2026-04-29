import { z } from 'zod';

export const CreateWithholdingSchema = z.object({
  kind: z.enum(['iibb', 'ganancias', 'iva', 'suss']),
  direction: z.enum(['suffered', 'applied']),
  jurisdictionId: z.string().min(3).max(40).optional(),
  taxId: z.string().min(3).max(40).optional(),
  customerId: z.string().min(3).max(40).optional(),
  supplierId: z.string().min(3).max(40).optional(),
  paymentId: z.string().min(3).max(40).optional(),
  invoiceId: z.string().min(3).max(40).optional(),
  supplierInvoiceId: z.string().min(3).max(40).optional(),
  amount: z.number().positive(),
  certificateNumber: z.string().optional(),
  date: z.string(),
});

export const ImportPadronesSchema = z.object({
  kind: z.enum(['iibb', 'ganancias', 'iva', 'suss']),
  jurisdictionId: z.string().min(3).max(40).optional(),
  source: z.string().optional(),
  rows: z.array(z.object({
    cuit: z.string().min(1),
    ratePerception: z.number().optional(),
    rateWithholding: z.number().optional(),
    validFrom: z.string(),
    validTo: z.string().optional(),
  })).min(1),
});
