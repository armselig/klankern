import { z } from "zod";

export const loginCredentialsSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;

export const verifyEmailSchema = z.object({
    token: z.string().min(1, "Verification token is required"),
});

export type VerifyEmail = z.infer<typeof verifyEmailSchema>;

export const RegisterBodySchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    inviteToken: z.string().optional(),
});

export type RegisterBody = z.infer<typeof RegisterBodySchema>;

export type RegisterResponse =
    | { success: true; userId: string; familyId?: string }
    | { success: false; error: string; code?: string };
