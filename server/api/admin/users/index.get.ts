import { defineEventHandler } from "h3";
import { db } from "#server/db";
import { logger } from "#server/utils/logger";

export default defineEventHandler(async (event) => {
    try {
        const users = await db.query.users.findMany({
            with: {
                userRoles: {
                    with: {
                        role: true,
                    },
                },
            },
        });

        return users;
    } catch (error: unknown) {
        logger.error("Error fetching users:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }
});
