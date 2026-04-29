import { z } from 'zod';

export const CreateBankAccountSchema = z.object({
  name: z.string().min(1),
  bankName: z.string().min(1),
  cbu: z.string().optional(),
  alias: z.string().optional(),
  currency: z.string().optional(),
  accountNumber: z.string().optional(),
});

export const UpdateBankAccountSchema = CreateBankAccountSchema.partial();
