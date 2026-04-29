import { z } from "zod";

export const paymentSchema = z.object({
  customerId: z.string().min(1, "Cliente requerido"),
  type: z.string().default("incoming"),
  amount: z.coerce.number().min(1, "El monto debe ser mayor a 0"),
  paymentMethod: z.enum([
    "cash",
    "transfer",
    "check",
    "digital",
    "check_third",
    "check_own",
  ]),
  currency: z.string().default("ARS"),
  externalReference: z.string().optional(),
  notes: z.string().optional(),
  // Fase 6 — Tesorería
  checkId: z.string().uuid().optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
