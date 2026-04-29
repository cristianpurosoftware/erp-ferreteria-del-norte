import { z } from 'zod';

export const CreateRouteSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  zoneId: z.string().min(3).max(40).optional(),
  defaultSellerId: z.string().min(3).max(40).optional(),
  defaultDriverId: z.string().min(3).max(40).optional(),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'custom']).optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const UpdateRouteSchema = CreateRouteSchema.partial().omit({ code: true });

export const AddRouteVisitSchema = z.object({
  customerId: z.string().min(3).max(40),
  sequence: z.number().int().min(0).optional(),
  visitWindow: z.enum(['morning', 'afternoon', 'all_day']).optional(),
});

export const CreateCustomerVisitSchema = z.object({
  customerId: z.string().min(3).max(40),
  routeId: z.string().min(3).max(40).optional(),
  sellerId: z.string().min(3).max(40).optional(),
  visitedAt: z.string().optional(),
  result: z.enum(['ordered', 'no_order', 'closed', 'absent']),
  orderId: z.string().min(3).max(40).optional(),
  notes: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
