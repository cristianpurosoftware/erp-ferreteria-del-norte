import { z } from "zod";

export const customerSchema = z.object({
  customerType: z.enum(["company", "individual"]).default("company"),
  legalName: z.string().min(2, "Razón social requerida"),
  commercialName: z.string().optional(),
  taxId: z.string().optional(),
  taxCondition: z.string().optional(),
  channel: z.string().optional(),
  assignedSellerId: z.string().optional(),
  priceListId: z.string().optional(),
  creditLimit: z.coerce.number().min(0, "Límite debe ser >= 0").default(0),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  // Fase 1 — Comercial
  category: z.enum(["A", "B", "C"]).optional(),
  zoneId: z.string().uuid().optional(),
  routeId: z.string().uuid().optional(),
  creditPolicy: z.enum(["normal", "strict", "blocked"]).default("normal"),
  blockOnOverdue: z.coerce.boolean().default(false),
  overdueDaysThreshold: z.coerce.number().int().min(0).default(0),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
