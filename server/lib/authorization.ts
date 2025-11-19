import { and, eq } from "drizzle-orm";
import { userRoles } from "#server/db/schema";
import type { DbConnection } from "#server/lib/types";

export async function isAdmin(
    dbConnection: DbConnection,
    userId: string,
): Promise<boolean> {
    const userRole = await dbConnection.query.userRoles.findFirst({
        where: and(eq(userRoles.user_id, userId)),
        with: {
            role: true,
        },
    });

    return userRole?.role.name === "admin";
}
