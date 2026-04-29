import { z } from 'zod';

const emptyToNull = (v: unknown) => (v === '' ? null : v);

// Accept 'simple' as alias for 'physical' for backward compatibility.
const productTypeSchema = z.preprocess(
  (v) => (v === 'simple' ? 'physical' : v),
  z.enum(['physical', 'service', 'digital']).optional(),
);

const VariantSchema = z.object({
  code: z.string().min(1),
  attributes: z.record(z.any()).nullable().optional(),
  price: z.number().min(0).nullable().optional(),
  cost: z.number().min(0).nullable().optional(),
});

export const CreateProductSchema = z.object({
  name: z.string().min(1),
  sku: z.preprocess(emptyToNull, z.string().nullable().optional()),
  description: z.preprocess(emptyToNull, z.string().nullable().optional()),
  categoryId: z.preprocess(emptyToNull, z.string().min(3).max(40).nullable().optional()),
  brandId: z.preprocess(emptyToNull, z.string().min(3).max(40).nullable().optional()),
  unitId: z.preprocess(emptyToNull, z.string().min(3).max(40).nullable().optional()),
  productType: productTypeSchema,
  basePrice: z.number().min(0).optional(),
  baseCost: z.number().min(0).optional(),
  controlsStock: z.boolean().optional(),
  minStock: z.number().int().min(0).optional(),
  tracksLot: z.boolean().optional(),
  tracksSerial: z.boolean().optional(),
  shelfLifeDays: z.number().int().min(0).nullable().optional(),
  reorderPoint: z.number().min(0).nullable().optional(),
  leadTimeDays: z.number().int().min(0).nullable().optional(),
  preferredSupplierId: z.preprocess(emptyToNull, z.string().min(3).max(40).nullable().optional()),
  variants: z.array(VariantSchema).optional(),
});

export const UpdateProductSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.preprocess(emptyToNull, z.string().nullable().optional()),
  description: z.preprocess(emptyToNull, z.string().nullable().optional()),
  categoryId: z.preprocess(emptyToNull, z.string().min(3).max(40).nullable().optional()),
  brandId: z.preprocess(emptyToNull, z.string().min(3).max(40).nullable().optional()),
  unitId: z.preprocess(emptyToNull, z.string().min(3).max(40).nullable().optional()),
  productType: productTypeSchema,
  basePrice: z.number().min(0).optional(),
  baseCost: z.number().min(0).optional(),
  controlsStock: z.boolean().optional(),
  minStock: z.number().int().min(0).optional(),
  tracksLot: z.boolean().optional(),
  tracksSerial: z.boolean().optional(),
  shelfLifeDays: z.number().int().min(0).nullable().optional(),
  reorderPoint: z.number().min(0).nullable().optional(),
  leadTimeDays: z.number().int().min(0).nullable().optional(),
  preferredSupplierId: z.preprocess(emptyToNull, z.string().min(3).max(40).nullable().optional()),
});
