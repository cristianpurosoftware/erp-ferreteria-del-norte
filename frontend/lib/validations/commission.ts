import { z } from "zod";

// Commissions are created via listeners, not direct forms.
// Kept for type parity and future extensions.

export const commissionStatusSchema = z.enum([
  "accrued",
  "approved",
  "paid",
  "reversed",
]);

export type CommissionStatusValue = z.infer<typeof commissionStatusSchema>;
