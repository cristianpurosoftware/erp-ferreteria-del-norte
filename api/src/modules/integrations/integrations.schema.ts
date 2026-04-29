import { z } from 'zod';

export const CreateIntegrationSchema = z.object({
  provider: z.string().min(1),
  type: z.string().min(1),
  credentialsRef: z.string().optional(),
  configuration: z.record(z.any()).optional(),
});

export const UpdateIntegrationSchema = z.object({
  credentialsRef: z.string().optional(),
  configuration: z.record(z.any()).optional(),
  status: z.enum(['inactive', 'active', 'paused']).optional(),
});
