import { z } from 'zod';

export const CreateBankStatementSchema = z.object({
  bankAccountId: z.string().min(3).max(40),
  periodStart: z.string(),
  periodEnd: z.string(),
  openingBalance: z.number(),
  closingBalance: z.number(),
  source: z.enum(['manual', 'csv', 'api']).optional(),
  lines: z.array(z.object({
    date: z.string(),
    description: z.string(),
    amount: z.number(),
    kind: z.enum(['credit', 'debit']),
    externalReference: z.string().optional(),
  })).optional(),
});
