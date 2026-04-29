import { z } from 'zod';

const Kinds = ['pick', 'bulk', 'quarantine', 'returns', 'staging'] as const;

export const CreateWarehouseLocationSchema = z.object({
  warehouseId: z.string().min(3).max(40),
  code: z.string().min(1),
  aisle: z.string().optional(),
  rack: z.string().optional(),
  shelf: z.string().optional(),
  bin: z.string().optional(),
  kind: z.enum(Kinds).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const UpdateWarehouseLocationSchema = CreateWarehouseLocationSchema.partial().omit({ warehouseId: true, code: true });
