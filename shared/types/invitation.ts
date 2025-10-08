import { z } from "zod";

/**
 * @fileoverview Shared types and validation schemas for the Invitation feature.
 */

// Zod schema for creating a new invitation. Used for request body validation.
export const InvitationCreateSchema = z.object({
    email: z
        .string({
            required_error: "Email address is required.",
        })
        .email("Invalid email address provided."),
});

// Inferred TypeScript type for creating an invitation.
export type InvitationCreate = z.infer<typeof InvitationCreateSchema>;
