import { z } from "zod";

export const lotSchema = z.object({
  productId: z.string().uuid("Producto requerido"),
  code: z.string().min(1, "Código requerido"),
  manufactureDate: z.string().optional(),
  expirationDate: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  receivedAt: z.string().optional(),
});

export type LotFormValues = z.infer<typeof lotSchema>;
