import { z } from "zod";

export const routeSchema = z.object({
  code: z.string().min(1, "Código requerido"),
  name: z.string().min(1, "Nombre requerido"),
  zoneId: z.string().uuid().optional(),
  defaultSellerId: z.string().uuid().optional(),
  defaultDriverId: z.string().uuid().optional(),
  frequency: z
    .enum(["daily", "weekly", "biweekly", "monthly", "custom"])
    .default("weekly"),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type RouteFormValues = z.infer<typeof routeSchema>;

export const routeVisitSchema = z.object({
  customerId: z.string().uuid("Cliente requerido"),
  sequence: z.coerce.number().int().min(0).optional(),
  visitWindow: z.enum(["morning", "afternoon", "all_day"]).optional(),
});

export type RouteVisitFormValues = z.infer<typeof routeVisitSchema>;
