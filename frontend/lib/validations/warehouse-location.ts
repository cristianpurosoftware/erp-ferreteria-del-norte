import { z } from "zod";

export const warehouseLocationSchema = z.object({
  warehouseId: z.string().uuid("Depósito requerido"),
  code: z.string().min(1, "Código requerido"),
  aisle: z.string().optional(),
  rack: z.string().optional(),
  shelf: z.string().optional(),
  bin: z.string().optional(),
  kind: z
    .enum(["pick", "bulk", "quarantine", "returns", "staging"])
    .default("pick"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type WarehouseLocationFormValues = z.infer<
  typeof warehouseLocationSchema
>;
