import { z } from 'zod';

export const CreateCollectorRenditionSchema = z.object({
  collectorId: z.string().min(3).max(40),
  shipmentId: z.string().min(3).max(40).optional(),
  date: z.string(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    paymentId: z.string().min(3).max(40),
    declaredAmount: z.number().min(0),
  })).optional(),
});

export const ApproveRenditionSchema = z.object({
  lines: z.array(z.object({
    id: z.string().min(3).max(40),
    acceptedAmount: z.number().min(0).optional(),
    reason: z.string().optional(),
  })).optional(),
}).passthrough();
