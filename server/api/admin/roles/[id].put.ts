import { defineEventHandler, readBody, getRouterParam } from "h3";
import { db } from "#server/db/index.ts"; // Corrected import path
import { roles } from "#server/db/schema.ts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { logger } from "#server/utils/logger"; // Import logger

// Define the schema for updating a role
const updateRoleSchema = z.object({
    name: z.enum(["admin", "parent", "child"]).optional(),
    description: z.string().optional(),
});

export default defineEventHandler(async (event) => {
    try {
        const id = getRouterParam(event, "id");

        if (!id) {
            throw createError({
                statusCode: 400,
                statusMessage: "Role ID is required.",
            });
        }

        const body = await readBody(event);
        const updatedRoleData = updateRoleSchema.parse(body);

        const [updatedRole] = await db
            .update(roles)
            .set(updatedRoleData)
            .where(eq(roles.id, id))
            .returning();

        if (!updatedRole) {
            throw createError({
                statusCode: 404,
                statusMessage: "Role not found or no changes made.",
            });
        }

        return { role: updatedRole };
    } catch (error) {
        logger.error("Error updating role:", error); // Use logger.error
        if (error instanceof z.ZodError) {
            throw createError({
                statusCode: 400,
                statusMessage: "Validation failed.",
                data: error.issues,
            });
        }
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to update role.",
        });
    }
});
