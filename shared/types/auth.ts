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
