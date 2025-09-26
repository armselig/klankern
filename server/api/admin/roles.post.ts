import { defineEventHandler, readBody } from "h3";
import { db } from "#server/db/index.ts";
import { roles } from "#server/db/schema.ts";
import { z } from "zod";
import { logger } from "#server/utils/logger"; // Import logger

// Define the schema for creating a new role
const createRoleSchema = z.object({
    name: z.enum(["admin", "parent", "child"]), // Assuming these are the only valid roles
    description: z.string().optional(),
});

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        const newRoleData = createRoleSchema.parse(body);

        const [newRole] = await db
            .insert(roles)
            .values(newRoleData)
            .returning();

        if (!newRole) {
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to create role.",
            });
        }

        return { role: newRole };
    } catch (error) {
        logger.error("Error creating role:", error); // Use logger.error
        if (error instanceof z.ZodError) {
            throw createError({
                statusCode: 400,
                statusMessage: "Validation failed.",
                data: error.issues,
            });
        }
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to create role.",
        });
    }
});
