import { z } from 'zod';

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Query requerido').max(100),
  types: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (!v) return undefined;
      const arr = Array.isArray(v) ? v : v.split(',');
      return arr.map((s) => s.trim()).filter(Boolean);
    }),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .default(5)
    .transform((v) => {
      const n = typeof v === 'number' ? v : parseInt(v, 10);
      if (!Number.isFinite(n) || n < 1) return 5;
      return Math.min(n, 20);
    }),
});

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
