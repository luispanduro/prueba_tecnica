import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(3, 'Min 3 characters').max(100),
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  password: z.string().min(6, 'Min 6 characters'),
});

export const editUserSchema = z.object({
  username: z.string().min(3, 'Min 3 characters').max(100).optional(),
  email: z.string().email('Invalid email').optional(),
  firstName: z.string().min(1, 'Required').optional(),
  lastName: z.string().min(1, 'Required').optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserForm = z.infer<typeof createUserSchema>;
export type EditUserForm = z.infer<typeof editUserSchema>;
