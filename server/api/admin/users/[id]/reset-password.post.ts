import { defineEventHandler, readBody } from "h3";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "#server/db";
import { users } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import { eq } from "drizzle-orm";

/**
 * @file API endpoint for an admin to reset a user's password.
 * @description This endpoint allows an administrator to set a new password for a user.
 * It's a critical administrative function that requires appropriate authorization.
 */

const passwordResetSchema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters long"),
});

interface PasswordResetPayload {
    password: string;
}

export default defineEventHandler(async (event) => {
    const userId = event.context.params?.id;
    if (!userId) {
        throw createError({
            statusCode: 400,
            statusMessage: "User ID is required",
        });
    }

    const body: PasswordResetPayload = await readBody(event);

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
            .where(eq(users.id, userId))
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
