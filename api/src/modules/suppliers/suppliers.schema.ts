import { z } from 'zod';

export const CreateSupplierSchema = z.object({
  name: z.string().min(1),
  taxId: z.string().optional(),
  primaryContact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  paymentCondition: z.string().optional(),
});

export const UpdateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  taxId: z.string().optional(),
  primaryContact: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  paymentCondition: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});
