import { defineEventHandler, createError, readBody } from "h3";
import { setUserSession } from "#auth";
import { db } from "~~/server/db";
import { users } from "~~/server/db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    // Ensure this endpoint is only available in test mode
    if (process.env.NODE_ENV !== "test") {
        throw createError({
            statusCode: 404,
            statusMessage: "Not Found",
        });
    }

    const { userId } = await readBody(event);
    if (!userId) {
        throw createError({ statusCode: 400, message: "userId is required" });
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user) {
        throw createError({ statusCode: 404, message: "User not found" });
    }

    // Create a session for the user
    // NOTE: This depends on the actual implementation of your auth system.
    // This is a placeholder for `nuxt-auth-utils` or similar.
    const session = {
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            display_name: user.display_name,
        },
    };
    await setUserSession(event, session);

    return { message: `Session created for user ${userId}` };
});
