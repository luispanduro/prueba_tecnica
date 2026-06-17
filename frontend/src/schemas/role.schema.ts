import { z } from 'zod';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createRoleSchema = z.object({
  name: z.string().min(1, 'Required').max(50, 'Max 50 characters'),
  description: z.string().max(255).optional(),
});

export const assignRoleSchema = z.object({
  userId: z.string().regex(uuidRegex, 'Must be a valid UUID'),
  roleId: z.string().regex(uuidRegex, 'Must be a valid UUID'),
});

export type CreateRoleForm = z.infer<typeof createRoleSchema>;
export type AssignRoleForm = z.infer<typeof assignRoleSchema>;
