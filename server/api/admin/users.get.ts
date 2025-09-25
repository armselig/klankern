import { defineEventHandler } from "h3";
import { db } from "#server/db/index.ts";
import { users, roles } from "#server/db/schema.ts";
import { eq } from "drizzle-orm";

export default defineEventHandler(async () => {
    try {
        const allUsers = await db
            .select({
                id: users.id,
                email: users.email,
                role: roles.name, // Select role name from the joined roles table
                dashboardConfig: users.dashboardConfig,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            })
            .from(users)
            .leftJoin(roles, eq(users.roleId, roles.id));

        return { users: allUsers };
    } catch (error) {
        console.error("Error fetching users:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch users.",
        });
    }
});
