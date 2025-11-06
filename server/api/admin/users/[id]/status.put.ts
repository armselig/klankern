import { eq, sql } from "drizzle-orm";
import { createError, defineEventHandler, H3Error, readBody } from "h3";
import { z } from "zod";
import { db } from "#server/db";
import { roles, userRoles, users } from "#server/db/schema";
import { logger } from "#server/utils/logger";

const userIdSchema = z.string().uuid();

/**
 * @file API endpoint to update a user's active status.
 * @description This endpoint provides a dedicated mechanism to activate or deactivate a user.
 * Separating this from the main update endpoint allows for more granular control and logging.
 */

export default defineEventHandler(async (event) => {
    logger.http(`${event.method} ${event.path}`);
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

    const validation = statusUpdateSchema.safeParse(body);
    if (!validation.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid status data",
            data: validation.error.errors,
        });
    }

    try {
        const [updatedUserResult] = await db
            .update(users)
            .set({
                is_active: validation.data.is_active,
                updated_at: new Date(),
            })
            .where(eq(users.id, parsedUserId.data))
            .returning({ id: users.id }); // Only return ID for subsequent fetch

        if (!updatedUserResult) {
            throw createError({
                statusCode: 404,
                statusMessage: "User not found",
            });
        }

        // Fetch the complete user object with roles
        const [userWithRoles] = await db
            .select({
                id: users.id,
                email: users.email,
                username: users.username,
                displayName: users.display_name,
                first_name: users.first_name,
                last_name: users.last_name,
                isActive: users.is_active,
                created_at: users.created_at,
                updated_at: users.updated_at,
                roles: sql<
                    {
                        id: string;
                        name: string;
                        description: string | null;
                    }[]
                >`json_agg(json_build_object('id', ${roles.id}, 'name', ${roles.name}, 'description', ${roles.description}))`,
            })
            .from(users)
            .leftJoin(userRoles, eq(users.id, userRoles.user_id))
            .leftJoin(roles, eq(userRoles.role_id, roles.id))
            .where(eq(users.id, updatedUserResult.id))
            .groupBy(users.id)
            .execute();

        if (!userWithRoles) {
            throw createError({
                statusCode: 404,
                statusMessage: "User not found after status update.",
            });
        }

        return userWithRoles;
    } catch (error: unknown) {
        // Type guard to check if the error is a 404 H3Error
        if (error instanceof H3Error && error.statusCode === 404) {
            throw error; // Re-throw the original 404 error
        }

        logger.error(
            `Error updating status for user with ID ${userId}:`,
            error,
        );
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }
});
