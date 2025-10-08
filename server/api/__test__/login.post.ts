import { eq } from "drizzle-orm";
import { defineEventHandler, createError, readBody } from "h3";
import { setUserSession } from "#imports";
import { db } from "#server/db";
import { users } from "#server/db/schema";
import { logger } from "#server/utils/logger";

export default defineEventHandler(async (event) => {
    // CRITICAL: This endpoint is for testing purposes only and must never be exposed
    // in a production environment.
    if (process.env.NODE_ENV !== "test") {
        logger.warn(
            "Attempted access to test-only login endpoint in non-test environment.",
        );
        throw createError({
            statusCode: 404,
            statusMessage: "Not Found",
        });
    }

    try {
        const { userId } = await readBody(event);
        if (!userId) {
            throw createError({
                statusCode: 400,
                statusMessage: "A userId must be provided.",
            });
        }

        // Find the user and their roles to create a valid session object
        const userToLogin = await db.query.users.findFirst({
            where: eq(users.id, userId),
            with: {
                userRoles: {
                    with: {
                        role: true,
                    },
                },
            },
        });

        if (!userToLogin) {
            throw createError({
                statusCode: 404,
                statusMessage: "User not found.",
            });
        }

        // Construct the session object that the application expects
        const sessionUser = {
            id: userToLogin.id,
            username: userToLogin.username,
            display_name: userToLogin.display_name,
            email: userToLogin.email,
            roles: userToLogin.userRoles.map((ur) => ur.role),
        };

        await setUserSession(event, sessionUser);

        return { message: `User ${userId} logged in successfully.` };
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
        ) {
            throw error;
        }
        logger.error("Error in test login endpoint:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
