import { z } from "zod";

export const loginCredentialsSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>;
