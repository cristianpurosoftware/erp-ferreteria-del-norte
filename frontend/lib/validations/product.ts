import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

export const productSchema = z.object({
  sku: z.preprocess(emptyToUndefined, z.string().optional()),
  name: z.string().min(2, "Nombre requerido"),
  description: z.preprocess(emptyToUndefined, z.string().optional()),
  categoryId: z.preprocess(emptyToUndefined, z.string().optional()),
  brandId: z.preprocess(emptyToUndefined, z.string().optional()),
  unitId: z.preprocess(emptyToUndefined, z.string().optional()),
  productType: z.enum(['physical', 'service', 'digital']).default('physical'),
  basePrice: z.coerce.number().min(0, "Precio debe ser >= 0"),
  baseCost: z.coerce.number().min(0, "Costo debe ser >= 0"),
  controlsStock: z.boolean().default(true),
  minStock: z.coerce.number().min(0, "Stock mínimo >= 0").default(0),
  status: z.enum(["draft", "active", "inactive", "discontinued"]).default("active"),
  tracksLot: z.coerce.boolean().default(false),
  tracksSerial: z.coerce.boolean().default(false),
  shelfLifeDays: z.coerce.number().int().min(0).optional(),
  reorderPoint: z.coerce.number().min(0).default(0),
  leadTimeDays: z.coerce.number().int().min(0).default(0),
  preferredSupplierId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

export type ProductFormValues = z.infer<typeof productSchema>;
