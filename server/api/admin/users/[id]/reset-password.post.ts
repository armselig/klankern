import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "#server/db";
import { users } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import { eq } from "drizzle-orm";

const userIdSchema = z.string().uuid();

/**
 * @file API endpoint for an admin to reset a user's password.
 * @description This endpoint allows an administrator to set a new password for a user.
 * It's a critical administrative function that requires appropriate authorization.
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

    const body = await readBody(event);

    const validation = passwordResetSchema.safeParse(body);
    if (!validation.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid password data",
            data: validation.error.errors,
        });
    }

    try {
        const hashedPassword = await bcrypt.hash(validation.data.password, 10);

        const [updatedUser] = await db
            .update(users)
            .set({ password: hashedPassword })
            .where(eq(users.id, parsedUserId.data))
            .returning();

        if (!updatedUser) {
            throw createError({
                statusCode: 404,
                statusMessage: "User not found",
            });
        }

        return { success: true, message: "Password updated successfully." };
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
            `Error resetting password for user with ID ${userId}:`,
            error,
        );
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }
});
