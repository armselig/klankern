import { eq, sql } from "drizzle-orm";
import { db } from "#server/db";
import {
    roles,
    userRoles,
    users,
    families,
    familyMembers,
} from "#server/db/schema";
import type { Role } from "#shared/types/user";

// Re-export types for convenience
export type { Role };

export interface UserWithRolesAndFamilies {
    id: string;
    email: string;
    password: string;
    email_verified: boolean | null;
    roles: Role[];
    families: Array<{ id: string; name: string }>;
}

/**
 * @function getUserWithRolesAndFamiliesByEmail
 * @description Fetches a user along with their roles and family memberships by email.
 * Uses a single JOIN query with JSON aggregation to avoid N+1 queries.
 * Families are filtered to exclude soft-deleted memberships.
 * @param {string} email - The email of the user to fetch.
 * @returns {Promise<UserWithRolesAndFamilies[]>} User with roles and families, or empty array if not found.
 */
export async function getUserWithRolesAndFamiliesByEmail(
    email: string,
): Promise<UserWithRolesAndFamilies[]> {
    const result = await db
        .select({
            id: users.id,
            email: users.email,
            password: users.password,
            email_verified: users.email_verified,
            roles: sql<Role[]>`COALESCE(
                json_agg(DISTINCT json_build_object(
                    'id', ${roles.id},
                    'name', ${roles.name},
                    'description', ${roles.description}
                )) FILTER (WHERE ${roles.id} IS NOT NULL),
                '[]'::json
            )`,
            families: sql<Array<{ id: string; name: string }>>`COALESCE(
                json_agg(DISTINCT json_build_object(
                    'id', ${families.id},
                    'name', ${families.name}
                )) FILTER (WHERE ${families.id} IS NOT NULL AND ${familyMembers.deleted_at} IS NULL),
                '[]'::json
            )`,
        })
        .from(users)
        .leftJoin(userRoles, eq(users.id, userRoles.user_id))
        .leftJoin(roles, eq(userRoles.role_id, roles.id))
        .leftJoin(familyMembers, eq(users.id, familyMembers.user_id))
        .leftJoin(families, eq(familyMembers.family_id, families.id))
        .where(eq(users.email, email))
        .groupBy(users.id);

    return result as UserWithRolesAndFamilies[];
}
