import { z } from "zod";

export const vehicleSchema = z.object({
  plate: z.string().min(1, "Patente requerida"),
  model: z.string().optional(),
  capacityKg: z.coerce.number().min(0).optional(),
  capacityM3: z.coerce.number().min(0).optional(),
  status: z.enum(["active", "maintenance", "retired"]).default("active"),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;
