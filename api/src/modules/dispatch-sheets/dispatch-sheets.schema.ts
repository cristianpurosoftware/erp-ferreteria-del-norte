import { z } from 'zod';

export const CreateDispatchSheetSchema = z.object({
  date: z.string(),
  vehicleId: z.string().min(3).max(40).optional(),
  driverId: z.string().min(3).max(40).optional(),
  warehouseId: z.string().min(3).max(40).optional(),
  notes: z.string().optional(),
});

export const UpdateDispatchSheetSchema = CreateDispatchSheetSchema.partial();
