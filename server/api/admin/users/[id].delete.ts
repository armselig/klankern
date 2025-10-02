import { defineEventHandler, createError } from "h3";
import { z } from "zod";
import { db } from "#server/db";
import { users } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import { eq } from "drizzle-orm";

const userIdSchema = z.string().uuid();

/**
 * @file API endpoint to delete a user.
 * @description This endpoint handles the permanent deletion of a user. Thanks to cascading deletes
 * in the database schema, deleting a user from the 'users' table will automatically remove
 * their associated roles, sessions, and other related data.
 */

export default defineEventHandler(async (event) => {
    const userId = event.context.params?.id;
    const parsedUserId = userIdSchema.safeParse(userId);

    if (!parsedUserId.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid User ID",
            data: parsedUserId.error.errors,
        });
    }

    try {
        const [deletedUser] = await db
            .delete(users)
            .where(eq(users.id, parsedUserId.data))
            .returning();

        if (!deletedUser) {
            throw createError({
                statusCode: 404,
                statusMessage: "User not found",
            });
        }

        return { success: true, message: "User deleted successfully." };
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

        logger.error(`Error deleting user with ID ${userId}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }
});
