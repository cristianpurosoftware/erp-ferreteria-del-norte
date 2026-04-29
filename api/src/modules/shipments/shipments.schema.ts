import { z } from 'zod';

export const CreateShipmentSchema = z.object({
  warehouseId: z.string().min(3).max(40),
  vehicleId: z.string().min(3).max(40).optional(),
  driverId: z.string().min(3).max(40).optional(),
  dispatchSheetId: z.string().min(3).max(40).optional(),
  plannedDate: z.string(),
});

export const UpdateShipmentSchema = CreateShipmentSchema.partial().omit({ warehouseId: true });

export const AddStopSchema = z.object({
  orderId: z.string().min(3).max(40),
  customerId: z.string().min(3).max(40),
  addressId: z.string().min(3).max(40).optional(),
  sequence: z.number().int().min(0).optional(),
  plannedWindow: z.string().optional(),
});

export const DeliverStopSchema = z.object({
  signatureUrl: z.string().optional(),
  notes: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
}).passthrough();

export const RejectStopSchema = z.object({
  reason: z.string().min(1),
  notes: z.string().optional(),
}).passthrough();
