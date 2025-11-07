import { eq, sql } from "drizzle-orm";
import { createError, defineEventHandler } from "h3";
import { db } from "#server/db";
import { roles, userRoles, users } from "#server/db/schema";
import { logger } from "#server/utils/logger";

export default defineEventHandler(async (event) => {
    logger.http(`${event.method} ${event.path}`);
    try {
        const usersWithRoles = await db
            .select({
                id: users.id,
                email: users.email,
                username: users.username,
                display_name: users.display_name,
                first_name: users.first_name,
                last_name: users.last_name,
                is_active: users.is_active,
                dashboard_config: users.dashboard_config,
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
