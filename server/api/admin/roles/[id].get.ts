import { defineEventHandler, getRouterParam } from "h3";
import { db } from "#server/db/index.ts";
import { roles } from "#server/db/schema.ts";
import { eq } from "drizzle-orm";
import { logger } from "#server/utils/logger"; // Import logger

export default defineEventHandler(async (event) => {
    try {
        const id = getRouterParam(event, "id");

        if (!id) {
            throw createError({
                statusCode: 400,
                statusMessage: "Role ID is required.",
            });
        }

        const [role] = await db.select().from(roles).where(eq(roles.id, id));

        if (!role) {
            throw createError({
                statusCode: 404,
                statusMessage: "Role not found.",
            });
        }

        return { role };
    } catch (error) {
        logger.error("Error fetching role:", error); // Use logger.error
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch role.",
        });
    }
});
