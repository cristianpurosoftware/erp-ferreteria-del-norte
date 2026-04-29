import { z } from "zod";

export const shipmentSchema = z.object({
  warehouseId: z.string().uuid("Depósito requerido"),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  dispatchSheetId: z.string().uuid().optional(),
  plannedDate: z.string().min(1, "Fecha requerida"),
});

export type ShipmentFormValues = z.infer<typeof shipmentSchema>;

export const shipmentStopSchema = z.object({
  orderId: z.string().uuid("Pedido requerido"),
  customerId: z.string().uuid("Cliente requerido"),
  addressId: z.string().uuid().optional(),
  sequence: z.coerce.number().int().min(0).optional(),
  plannedWindow: z.string().optional(),
});

export type ShipmentStopFormValues = z.infer<typeof shipmentStopSchema>;
