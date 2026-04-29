import { z } from 'zod';

export const CreateRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissionIds: z.array(z.string().min(3).max(40)).min(1),
});

export const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permissionIds: z.array(z.string().min(3).max(40)).optional(),
});

export type CreateRoleDto = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleDto = z.infer<typeof UpdateRoleSchema>;
