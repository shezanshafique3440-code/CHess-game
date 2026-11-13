import { z } from 'zod';
const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
const password = z.string().min(8).max(128);
export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(24)
      .regex(/^[a-z0-9_]+$/)
      .refine((value) => !value.startsWith('guest_')),
    email,
    password,
  })
  .strict();
export const loginSchema = z.object({ email, password }).strict();
export const guestSchema = z.object({}).strict();
