import { eq, sql } from "drizzle-orm";
import { createError, defineEventHandler, H3Error } from "h3";
import { z } from "zod";
import { db } from "#server/db";
import { roles, userRoles, users } from "#server/db/schema";
import { logger } from "#server/utils/logger";

const userIdSchema = z.string().uuid();

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

    try {
        const [user] = await db
            .select({
                id: users.id,
                email: users.email,
                username: users.username,
                displayName: users.display_name,
                first_name: users.first_name,
                last_name: users.last_name,
                isActive: users.is_active,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
                roles: sql<
                    {
                        id: string;
                        name: string;
                        description: string | null;
                    }[]
                >`json_agg(json_build_object('id', ${roles.id}, 'name', ${roles.name}, 'description', ${roles.description}))`,
            })
            .from(users)
            .leftJoin(userRoles, eq(users.id, userRoles.userId))
            .leftJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(users.id, parsedUserId.data))
            .groupBy(users.id)
            .execute();

        if (!user) {
            throw createError({
                statusCode: 404,
                statusMessage: "User not found",
            });
        }

        return user as UserResponse;
    } catch (error: unknown) {
        // Type guard to check if the error is a 404 H3Error
        if (error instanceof H3Error && error.statusCode === 404) {
            throw error; // Re-throw the original 404 error
        }

        logger.error(`Error fetching user with ID ${userId}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }
});
