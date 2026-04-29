import { z } from 'zod';

export const UpdateCompanySchema = z.object({
  razon_social: z.string().min(1).optional(),
  nombre_comercial: z.string().min(1).optional(),
  moneda_base: z.string().min(1).optional(),
  pais: z.string().min(1).optional(),
  tax_ids: z.record(z.any()).nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  timezone: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
});
