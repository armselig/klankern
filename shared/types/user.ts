import { z } from "zod";

export const newUserSchema = z.object({
    email: z.string().email(),
    username: z.string().min(3),
    password: z.string().min(8),
    display_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
});

export type NewUser = z.infer<typeof newUserSchema>;

export const roleSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
});

export const userResponseSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    username: z.string(),
    displayName: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
    roles: z.array(roleSchema),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

export const updateUserSchema = z.object({
    email: z.string().email().optional(),
    username: z.string().min(3).optional(),
    display_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    is_active: z.boolean().optional(),
    roleIds: z.array(z.string().uuid()).optional(),
});

export type UpdateUser = z.infer<typeof updateUserSchema>;

export const passwordResetSchema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters long"),
});

export type PasswordReset = z.infer<typeof passwordResetSchema>;

export const statusUpdateSchema = z.object({
    is_active: z.boolean(),
});

export type StatusUpdate = z.infer<typeof statusUpdateSchema>;
