import { defineEventHandler } from "h3";
import { db } from "#server/db";
import { getAllUsersWithRoles } from "#server/services/users";
import { logger } from "#server/utils/logger";
import { requireAdmin } from "#server/utils/auth";
import { translateError } from "#server/lib/errors";

export default defineEventHandler(async (event) => {
    logger.http(`${event.method} ${event.path}`);
    await requireAdmin(event);
    try {
        const usersWithRoles = await getAllUsersWithRoles(
            db,
            event.context.user?.id,
        );
        return usersWithRoles;
    } catch (error) {
        logger.error("Error fetching users:", error);
        throw translateError(error);
    }
});
