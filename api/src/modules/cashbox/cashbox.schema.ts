import { z } from 'zod';

export const CreateCashboxSchema = z.object({
  name: z.string().min(1),
  branchId: z.string().min(3).max(40),
});

export const UpdateCashboxSchema = z.object({
  name: z.string().min(1).optional(),
  branchId: z.string().min(3).max(40).optional(),
});

export const OpenCashboxSchema = z.object({
  openingBalance: z.number().min(0),
});

export const CloseCashboxSchema = z.object({
  closingBalance: z.number().min(0),
  notes: z.string().optional(),
});
