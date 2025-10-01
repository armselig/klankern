import { defineEventHandler, readBody } from "h3";
import { z } from "zod";
import { db } from "#server/db";
import { users } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import { eq } from "drizzle-orm";

/**
 * @file API endpoint to update a user's active status.
 * @description This endpoint provides a dedicated mechanism to activate or deactivate a user.
 * Separating this from the main update endpoint allows for more granular control and logging.
 */

const statusUpdateSchema = z.object({
    is_active: z.boolean(),
});

interface StatusUpdatePayload {
    is_active: boolean;
}

export default defineEventHandler(async (event) => {
    const userId = event.context.params?.id;
    if (!userId) {
        throw createError({
            statusCode: 400,
            statusMessage: "User ID is required",
        });
    }

    const body: StatusUpdatePayload = await readBody(event);

    const validation = statusUpdateSchema.safeParse(body);
    if (!validation.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid status data",
            data: validation.error.errors,
        });
    }

    try {
        const [updatedUser] = await db
            .update(users)
            .set({ is_active: validation.data.is_active })
            .where(eq(users.id, userId))
            .returning();

        if (!updatedUser) {
            throw createError({
                statusCode: 404,
                statusMessage: "User not found",
            });
        }

        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    } catch (error: unknown) {
        // Type guard to check if the error is a 404 H3Error
        if (
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error &&
            (error as any).statusCode === 404
        ) {
            throw error; // Re-throw the original 404 error
        }

        logger.error(
            `Error updating status for user with ID ${userId}:`,
            error,
        );
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }
});
