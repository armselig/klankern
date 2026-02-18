import { and, eq } from "drizzle-orm";
import { users, userRoles } from "#server/db/schema";
import type { DbConnection } from "#server/lib/types";

export async function isAdmin(
    dbConnection: DbConnection,
    userId: string,
): Promise<boolean> {
    const user = await dbConnection.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user?.is_active) {
        return false;
    }

    const userRole = await dbConnection.query.userRoles.findFirst({
        where: and(eq(userRoles.user_id, userId)),
        with: {
            role: true,
        },
    });

    return userRole?.role.name === "admin";
}
