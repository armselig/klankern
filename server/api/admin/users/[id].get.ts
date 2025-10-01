import { defineEventHandler } from "h3";
import { db } from "#server/db";
import { logger } from "#server/utils/logger";

export default defineEventHandler(async (event) => {
    const userId = event.context.params?.id;

    if (!userId) {
        throw createError({
            statusCode: 400,
            statusMessage: "User ID is required",
        });
    }

    try {
        const user = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, userId),
            with: {
                userRoles: {
                    with: {
                        role: true,
                    },
                },
            },
        });

        if (!user) {
            throw createError({
                statusCode: 404,
                statusMessage: "User not found",
            });
        }

        const { password, ...userWithoutPassword } = user;
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

        logger.error(`Error fetching user with ID ${userId}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }
});
