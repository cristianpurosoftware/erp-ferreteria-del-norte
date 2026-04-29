import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LoginDto = z.infer<typeof LoginSchema>;
export type RefreshDto = z.infer<typeof RefreshSchema>;
