import { roles } from "#server/db/schema";
import type { DbConnection } from "#server/lib/types";
import {
    InternalError,
    UnauthorizedError,
    ForbiddenError,
} from "#server/lib/errors";
import { logger } from "#server/utils/logger";
import { isAdmin } from "#server/lib/authorization";

/**
 * Retrieves all roles from the database.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @param userId - ID of the user performing the operation
 * @returns Array of all roles
 * @throws {UnauthorizedError} If user is not authenticated
 * @throws {ForbiddenError} If user is not an admin
 */
export async function getAllRoles(
    dbConnection: DbConnection,
    userId: string | null | undefined,
) {
    if (!userId) {
        throw new UnauthorizedError("User not authenticated");
    }

    if (!(await isAdmin(dbConnection, userId))) {
        throw new ForbiddenError("User does not have admin privileges");
    }

    const allRoles = await dbConnection.query.roles.findMany();
    logger.info(`Retrieved ${allRoles.length} roles`);
    return allRoles;
}

/**
 * Creates a new role.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @param userId - ID of the user performing the operation
 * @param data - Role creation data
 * @returns The newly created role
 * @throws {UnauthorizedError} If user is not authenticated
 * @throws {ForbiddenError} If user is not an admin
 */
export async function createRole(
    dbConnection: DbConnection,
    userId: string | null | undefined,
    data: { name: string; description?: string },
) {
    if (!userId) {
        throw new UnauthorizedError("User not authenticated");
    }

    if (!(await isAdmin(dbConnection, userId))) {
        throw new ForbiddenError("User does not have admin privileges");
    }

    const [newRole] = await dbConnection
        .insert(roles)
        .values({
            name: data.name,
            description: data.description || "",
        })
        .returning();

    if (!newRole) {
        logger.error(`Role creation failed for name ${data.name}`);
        throw new InternalError("Role creation failed during insert");
    }

    logger.info(`Role created: ${newRole.id} (${newRole.name})`);
    return newRole;
}
