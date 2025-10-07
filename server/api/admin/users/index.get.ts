import { defineEventHandler } from "h3";
import { db } from "#server/db";
import { logger } from "#server/utils/logger";
import { users, userRoles, roles } from "#server/db/schema";
import { eq, sql } from "drizzle-orm";

export default defineEventHandler(async () => {
    try {
        const usersWithRoles = await db
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
            .groupBy(users.id)
            .execute();

        return usersWithRoles;
    } catch (error: unknown) {
        logger.error("Error fetching users:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }
});
