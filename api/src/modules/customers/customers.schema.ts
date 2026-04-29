import { z } from 'zod';

const ContactSchema = z.object({
  name: z.string().min(1),
  position: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const AddressSchema = z.object({
  type: z.enum(['shipping', 'billing', 'admin']).optional(),
  street: z.string().min(1),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
});

export const CreateCustomerSchema = z.object({
  customerType: z.enum(['company', 'individual']).optional(),
  legalName: z.string().min(1),
  commercialName: z.string().optional(),
  taxId: z.string().optional(),
  taxCondition: z.string().optional(),
  channel: z.string().optional(),
  assignedSellerId: z.string().min(3).max(40).optional(),
  priceListId: z.string().min(3).max(40).optional(),
  creditLimit: z.number().min(0).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  contacts: z.array(ContactSchema).optional(),
  addresses: z.array(AddressSchema).optional(),
  // Phase 1 additions
  category: z.enum(['A', 'B', 'C']).optional(),
  zoneId: z.string().min(3).max(40).optional(),
  routeId: z.string().min(3).max(40).optional(),
  creditPolicy: z.enum(['normal', 'strict', 'blocked']).optional(),
  blockOnOverdue: z.boolean().optional(),
  overdueDaysThreshold: z.number().int().min(0).optional(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();
