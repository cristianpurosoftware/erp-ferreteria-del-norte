import { z } from 'zod';

export const CreateVehicleSchema = z.object({
  plate: z.string().min(1),
  model: z.string().optional(),
  capacityKg: z.number().optional(),
  capacityM3: z.number().optional(),
  status: z.enum(['active', 'maintenance', 'retired']).optional(),
});

export const UpdateVehicleSchema = CreateVehicleSchema.partial().omit({ plate: true });
