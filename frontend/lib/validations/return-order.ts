import { z } from "zod";

export const returnOrderSchema = z.object({
  customerId: z.string().uuid("Cliente requerido"),
  shipmentId: z.string().uuid().optional(),
  shipmentStopId: z.string().uuid().optional(),
  originalOrderId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  kind: z
    .enum([
      "not_delivered",
      "rejected_by_customer",
      "damaged",
      "expired",
      "commercial",
    ])
    .default("commercial"),
  notes: z.string().optional(),
});

export type ReturnOrderFormValues = z.infer<typeof returnOrderSchema>;
