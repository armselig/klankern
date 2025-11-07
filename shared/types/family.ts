import { z } from "zod";

/**
 * @fileoverview Shared types and validation schemas for the Family feature.
 */

// Zod schema for creating a new family. Used for request body validation.
export const FamilyCreateSchema = z.object({
    name: z
        .string({
            message: "Family name is required.",
        })
        .min(1, "Family name cannot be empty.")
        .max(100, "Family name cannot exceed 100 characters."),
});

// Zod schema representing a complete family object, mirroring the database schema.
export const FamilySchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    creator_id: z.string().uuid(),
    created_at: z.date(),
    updated_at: z.date(),
    deleted_at: z.date().nullable(),
});

// Zod schema for transferring family ownership
export const FamilyTransferOwnershipSchema = z.object({
    newOwnerId: z
        .string({
            message: "New owner ID is required.",
        })
        .uuid("New owner ID must be a valid UUID."),
});

// Inferred TypeScript type for a family object.
export type Family = z.infer<typeof FamilySchema>;

// Inferred TypeScript type for creating a family.
export type FamilyCreate = z.infer<typeof FamilyCreateSchema>;

// Inferred TypeScript type for transferring family ownership.
export type FamilyTransferOwnership = z.infer<
    typeof FamilyTransferOwnershipSchema
>;
