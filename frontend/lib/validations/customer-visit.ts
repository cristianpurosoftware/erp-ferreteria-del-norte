import { z } from "zod";

export const customerVisitSchema = z.object({
  customerId: z.string().uuid("Cliente requerido"),
  routeId: z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
  visitedAt: z.string().optional(),
  result: z.enum(["ordered", "no_order", "closed", "absent"]),
  orderId: z.string().uuid().optional(),
  notes: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

export type CustomerVisitFormValues = z.infer<typeof customerVisitSchema>;
