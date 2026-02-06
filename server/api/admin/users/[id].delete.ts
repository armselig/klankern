import { eq } from "drizzle-orm";
import { createError, defineEventHandler, H3Error } from "h3";
import { z } from "zod";
import { db } from "#server/db";
import { userRoles, users } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import { requireAdmin } from "#server/utils/auth";

const userIdSchema = z.string().uuid("Invalid user ID format");

export default defineEventHandler(async (event) => {
    logger.http(`${event.method} ${event.path}`);
    await requireAdmin(event);
    const userId = event.context.params?.id;
    const parsedUserId = userIdSchema.safeParse(userId);

    if (!parsedUserId.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Bad Request",
            data: parsedUserId.error.issues,
        });
    }

    try {
        const deletedUser = await db
            .delete(users)
            .where(eq(users.id, parsedUserId.data))
            .returning({ id: users.id });

        if (deletedUser.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: "User not found",
            });
        }

        // Also delete associated user roles
        await db
            .delete(userRoles)
            .where(eq(userRoles.user_id, parsedUserId.data));

        return { message: "User deleted successfully" };
    } catch (error: unknown) {
        logger.error(`Error deleting user with ID ${userId}:`, error);
        throw createError({
            statusCode: (error instanceof H3Error && error.statusCode) || 500,
            statusMessage: "Internal Server Error",
        });
    }
});
