import { defineEventHandler } from "h3";
import { clearUserSession, getUserSession } from "#auth";
import { logger } from "#server/utils/logger";

/**
 * @api {post} /api/auth/logout
 * @description Logs the user out by clearing the server-side session.
 * @returns {{ message: string }} Success message
 */
export default defineEventHandler(async (event) => {
    logger.http(`${event.method} ${event.path}`);

    const session = await getUserSession(event);

    if (session.user) {
        logger.info(`User ${session.user.id} logging out`);
    }

    await clearUserSession(event);

    return { message: "Logged out successfully" };
});
