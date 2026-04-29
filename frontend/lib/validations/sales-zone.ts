import { z } from "zod";

export const salesZoneSchema = z.object({
  code: z.string().min(1, "Código requerido").max(64),
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().optional(),
  parentZoneId: z.string().uuid().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type SalesZoneFormValues = z.infer<typeof salesZoneSchema>;
