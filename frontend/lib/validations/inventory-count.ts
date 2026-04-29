import { z } from "zod";

export const inventoryCountSchema = z.object({
  warehouseId: z.string().uuid("Depósito requerido"),
  kind: z.enum(["cycle", "full", "spot"]).default("cycle"),
  notes: z.string().optional(),
});

export type InventoryCountFormValues = z.infer<typeof inventoryCountSchema>;

export const dispatchSheetSchema = z.object({
  date: z.string().min(1, "Fecha requerida"),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export type DispatchSheetFormValues = z.infer<typeof dispatchSheetSchema>;
