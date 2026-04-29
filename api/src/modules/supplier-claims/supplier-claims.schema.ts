import { z } from 'zod';

const Kinds = ['short_qty', 'damaged', 'wrong_sku', 'overpricing', 'missing_cae'] as const;

export const CreateSupplierClaimSchema = z.object({
  supplierId: z.string().min(3).max(40),
  supplierInvoiceId: z.string().min(3).max(40).optional(),
  purchaseOrderId: z.string().min(3).max(40).optional(),
  kind: z.enum(Kinds),
  amount: z.number().optional(),
  notes: z.string().optional(),
});

export const UpdateSupplierClaimSchema = z.object({
  notes: z.string().optional(),
  amount: z.number().optional(),
}).passthrough();
