import { defineEventHandler, createError } from "h3";
import { z } from "zod";
import { db } from "#server/db";
import { logger } from "#server/utils/logger";
import { users, userRoles, roles } from "#server/db/schema";
import { eq, sql } from "drizzle-orm";

const userIdSchema = z.string().uuid();

export default defineEventHandler(async (event) => {
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

        return user;
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
