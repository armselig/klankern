import { roles } from "#server/db/schema";
import type { DbConnection } from "#server/lib/types";
import { logger } from "#server/utils/logger";

/**
 * Retrieves all roles from the database.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @returns Array of all roles
 */
export async function getAllRoles(dbConnection: DbConnection) {
    const allRoles = await dbConnection.query.roles.findMany();
    logger.info(`Retrieved ${allRoles.length} roles`);
    return allRoles;
}

/**
 * Creates a new role.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @param data - Role creation data
 * @returns The newly created role
 */
export async function createRole(
    dbConnection: DbConnection,
    data: { name: string; description?: string },
) {
    const [newRole] = await dbConnection
        .insert(roles)
        .values({
            name: data.name,
            description: data.description || "",
        })
        .returning();

    if (!newRole) {
        logger.error(`Role creation failed for name ${data.name}`);
        throw new Error("Role creation failed during insert");
    }

    logger.info(`Role created: ${newRole.id} (${newRole.name})`);
    return newRole;
}
