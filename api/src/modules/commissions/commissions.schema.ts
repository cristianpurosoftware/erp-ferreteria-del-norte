import { z } from 'zod';

export const ApproveCommissionSchema = z.object({}).passthrough();
export const ReverseCommissionSchema = z.object({ reason: z.string().optional() }).passthrough();
