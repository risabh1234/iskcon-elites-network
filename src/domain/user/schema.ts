import { z } from 'zod';

export const ROLES = ['USER', 'ADMIN', 'SUPERADMIN'] as const;

export const updateRoleSchema = z.object({ role: z.enum(ROLES) });

export const updatePermissionsSchema = z.object({ canCreateEvents: z.boolean() });

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>;
