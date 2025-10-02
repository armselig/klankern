import { z } from "zod";

export const createRoleSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
});

export type CreateRole = z.infer<typeof createRoleSchema>;

export const roleResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
});

export type RoleResponse = z.infer<typeof roleResponseSchema>;

export const updateRoleSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
});

export type UpdateRole = z.infer<typeof updateRoleSchema>;
