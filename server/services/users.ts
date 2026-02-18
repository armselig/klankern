import { eq, sql } from "drizzle-orm";
import { users, userRoles, roles } from "#server/db/schema";
import type { DbConnection } from "#server/lib/types";
import {
    InternalError,
    ConflictError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
} from "#server/lib/errors";
import { logger } from "#server/utils/logger";
import { customHashPassword } from "#server/utils/password";
import { isAdmin } from "#server/lib/authorization";
import { findResourceOrThrow } from "#server/lib/validation";

/**
 * Retrieves all users with their roles from the database.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @param userId - ID of the user performing the operation
 * @returns Array of users with their role information
 * @throws {UnauthorizedError} If user is not authenticated
 * @throws {ForbiddenError} If user is not an admin
 */
export async function getAllUsersWithRoles(
    dbConnection: DbConnection,
    userId: string | null | undefined,
) {
    if (!userId) {
        throw new UnauthorizedError("User not authenticated");
    }

    if (!(await isAdmin(dbConnection, userId))) {
        throw new ForbiddenError("User does not have admin privileges");
    }

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
 * @param userId - ID of the user performing the operation
 * @param data - User creation data including email, username, password, and optional role IDs
 * @returns The newly created user (without password)
 * @throws {UnauthorizedError} If user is not authenticated
 * @throws {ForbiddenError} If user is not an admin
 * @throws {ConflictError} If a user with the same email or username already exists
 * @throws {InternalError} If user creation fails
 */
export async function createUser(
    dbConnection: DbConnection,
    userId: string | null | undefined,
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
    if (!userId) {
        throw new UnauthorizedError("User not authenticated");
    }

    if (!(await isAdmin(dbConnection, userId))) {
        throw new ForbiddenError("User does not have admin privileges");
    }

    // Input Validation
    const { email, username, password } = data;

    // Email validation
    if (!email || email.trim() === "") {
        throw new ValidationError("Email cannot be empty");
    }
    if (email.length > 255) {
        throw new ValidationError("Email cannot exceed 255 characters");
    }
    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new ValidationError("Invalid email format");
    }

    // Username validation
    if (!username || username.trim() === "") {
        throw new ValidationError("Username cannot be empty");
    }
    if (username.length < 3) {
        throw new ValidationError(
            "Username must be at least 3 characters long",
        );
    }
    if (username.length > 50) {
        throw new ValidationError("Username cannot exceed 50 characters");
    }
    // Alphanumeric, underscore, or hyphen
    if (!/^[\p{L}\p{N}\p{Emoji}_-]+$/u.test(username)) {
        throw new ValidationError(
            "Username can only contain letters, numbers, emojis, underscores, and hyphens",
        );
    }

    // Password validation
    if (!password || password.trim() === "") {
        throw new ValidationError("Password cannot be empty");
    }
    if (password.length < 8) {
        throw new ValidationError(
            "Password must be at least 8 characters long",
        );
    }
    if (password.length > 128) {
        throw new ValidationError("Password cannot exceed 128 characters");
    }

    try {
        const hashedPassword = await customHashPassword(password);

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

/**
 * Permanently deletes a user from the database (hard-delete).
 *
 * This is an admin-only operation. All related records (sessions, userRoles,
 * familyMembers, userConsents) are removed via ON DELETE CASCADE database constraints.
 * This action is irreversible.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @param adminUserId - ID of the admin performing the deletion
 * @param targetUserId - ID of the user to permanently delete
 * @returns Object confirming deletion with the deleted user's ID
 * @throws {UnauthorizedError} If adminUserId is not provided
 * @throws {ForbiddenError} If the requesting user is not an admin
 * @throws {NotFoundError} If the target user does not exist
 */
export async function deleteUser(
    dbConnection: DbConnection,
    adminUserId: string | null | undefined,
    targetUserId: string,
) {
    if (!adminUserId) {
        throw new UnauthorizedError("User not authenticated");
    }

    if (!(await isAdmin(dbConnection, adminUserId))) {
        throw new ForbiddenError("User does not have admin privileges");
    }

    // Verify the target user exists before attempting deletion
    await findResourceOrThrow(
        () =>
            dbConnection.query.users.findFirst({
                where: eq(users.id, targetUserId),
            }),
        "User",
    );

    const [deletedUser] = await dbConnection
        .delete(users)
        .where(eq(users.id, targetUserId))
        .returning({ id: users.id });

    if (!deletedUser) {
        throw new NotFoundError("User not found");
    }

    logger.info(`User hard-deleted: ${targetUserId} by admin ${adminUserId}`);

    return { id: deletedUser.id };
}
