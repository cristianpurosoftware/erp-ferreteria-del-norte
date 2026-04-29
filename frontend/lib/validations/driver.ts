import { z } from "zod";

export const driverSchema = z.object({
  userId: z.string().uuid().optional(),
  fullName: z.string().min(1, "Nombre requerido"),
  dni: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseExpires: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type DriverFormValues = z.infer<typeof driverSchema>;
