import { z } from 'zod';

export const CreateJurisdictionSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['national', 'provincial', 'municipal']).optional(),
  parentJurisdictionId: z.string().min(3).max(40).optional(),
});

export const UpdateJurisdictionSchema = CreateJurisdictionSchema.partial().omit({ code: true });

export const AddCustomerJurisdictionSchema = z.object({
  jurisdictionId: z.string().min(3).max(40),
  condition: z.enum(['inscripto', 'no_inscripto', 'exento', 'convenio_multilateral']).optional(),
  inscriptionNumber: z.string().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
});
