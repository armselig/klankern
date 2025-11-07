import { eq, sql } from "drizzle-orm";
import { db } from "#server/db";
import { roles, userRoles, users } from "#server/db/schema";
import type { Role, UserWithRoles } from "#shared/types/user";

// Re-export types for convenience
export type { Role, UserWithRoles };

/**
 * @function getUserWithRolesByEmail
 * @description Fetches a user from the database along with their associated roles, given the user's email.
 * This function encapsulates the complex Drizzle ORM query involving joins and aggregation to retrieve
 * a comprehensive user object.
 * @param {string} email - The email of the user to fetch.
 * @returns {Promise<UserWithRoles[]>} A promise that resolves to an array containing the user object with roles,
 * or an empty array if no user is found.
 */
export async function getUserWithRolesByEmail(
    email: string,
): Promise<UserWithRoles[]> {
    const result = await db
        .select({
            id: users.id,
            email: users.email,
            password: users.password,
            roles: sql<
                Role[]
            >`json_agg(json_build_object('id', ${roles.id}, 'name', ${roles.name}, 'description', ${roles.description}))`,
        })
        .from(users)
        .leftJoin(userRoles, eq(users.id, userRoles.user_id))
        .leftJoin(roles, eq(userRoles.role_id, roles.id))
        .where(eq(users.email, email))
        .groupBy(users.id);

    return result as UserWithRoles[];
}
