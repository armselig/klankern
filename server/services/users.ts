import { eq, sql } from "drizzle-orm";
import { users, userRoles, roles } from "#server/db/schema";
import type { DbConnection } from "#server/lib/types";
import { InternalError, ConflictError } from "#server/lib/errors";
import { logger } from "#server/utils/logger";
import { customHashPassword } from "#server/utils/password";

/**
 * Retrieves all users with their roles from the database.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @returns Array of users with their role information
 */
export async function getAllUsersWithRoles(dbConnection: DbConnection) {
    const usersWithRoles = await dbConnection
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
}

/**
 * Creates a new user with assigned roles.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @param data - User creation data including email, username, password, and optional role IDs
 * @returns The newly created user (without password)
 * @throws {ConflictError} If a user with the same email or username already exists
 * @throws {InternalError} If user creation fails
 */
export async function createUser(
    dbConnection: DbConnection,
    data: {
        email: string;
        username: string;
        password: string;
        display_name?: string;
        first_name?: string;
        last_name?: string;
        roleIds?: string[];
    },
) {
    try {
        const hashedPassword = await customHashPassword(data.password);

        const [createdUser] = await dbConnection
            .insert(users)
            .values({
                email: data.email,
                username: data.username,
                password: hashedPassword,
                display_name: data.display_name,
                first_name: data.first_name,
                last_name: data.last_name,
            })
            .returning();

        if (!createdUser) {
            throw new InternalError("Failed to create user");
        }

        // Assign roles if provided
        if (data.roleIds && data.roleIds.length > 0) {
            await dbConnection.insert(userRoles).values(
                data.roleIds.map((roleId) => ({
                    user_id: createdUser.id,
                    role_id: roleId,
                })),
            );
        }

        logger.info(`User created: ${createdUser.email}`);

        // Omit password from response
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _, ...userWithoutPassword } = createdUser;
        return userWithoutPassword;
    } catch (error) {
        // Check for unique constraint violation (duplicate email/username)
        // Drizzle wraps errors, so we need to check both error.code and error.cause.code
        const dbError =
            error && typeof error === "object" && "cause" in error
                ? error.cause
                : error;

        if (
            typeof dbError === "object" &&
            dbError !== null &&
            "code" in dbError &&
            (dbError as { code: string }).code === "23505"
        ) {
            throw new ConflictError(
                "A user with this email or username already exists",
            );
        }
        throw error;
    }
}
