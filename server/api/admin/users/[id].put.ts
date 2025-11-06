import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { db } from "#server/db";
import { users, userRoles, roles } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import { eq, sql } from "drizzle-orm";
import { customHashPassword } from "#server/utils/password";

const userIdSchema = z.string().uuid();

export default defineEventHandler(async (event) => {
    logger.http(`${event.method} ${event.path}`);
    const userId = event.context.params?.id;
    const parsedUserId = userIdSchema.safeParse(userId);

    if (!parsedUserId.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid User ID",
            data: parsedUserId.error.errors,
        });
    }

    const body: UserUpdatePayload = await readBody(event);

    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid user data",
            data: validation.error.errors,
        });
    }

    const { roleIds, password, ...userDetails } = validation.data;

    // Create a new object with the correct type, ensuring password is optional
    const userDetailsWithPassword: Partial<Omit<UpdateUser, "roleIds">> & {
        password?: string;
    } = { ...userDetails };

    if (password) {
        // Hash the new password before storing it
        userDetailsWithPassword.password = await customHashPassword(password);
    }

    /**
     * The reason for using a transaction here is to ensure data integrity.
     * If updating the user's roles fails for any reason after updating their
     * personal details, the entire operation will be rolled back.
     */
    try {
        const updatedUser = await db.transaction(async (tx) => {
            if (Object.keys(userDetails).length > 0) {
                await tx
                    .update(users)
                    .set(userDetails)
                    .where(eq(users.id, parsedUserId.data));
            }

            if (roleIds) {
                // This is a full replacement of roles. We first delete all existing roles
                // for the user and then insert the new ones.
                await tx
                    .delete(userRoles)
                    .where(eq(userRoles.user_id, parsedUserId.data));
                if (roleIds.length > 0) {
                    await tx.insert(userRoles).values(
                        roleIds.map((roleId) => ({
                            user_id: parsedUserId.data,
                            role_id: roleId,
                        })),
                    );
                }
            }

            // Fetch the user again to return the updated data, including relations.
            const user = await tx
                .select({
                    id: users.id,
                    email: users.email,
                    username: users.username,
                    display_name: users.display_name,
                    is_active: users.is_active,
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
                .where(eq(users.id, parsedUserId.data))
                .groupBy(users.id)
                .execute();

            if (!user || user.length === 0) {
                // This should theoretically not happen if the initial user ID was valid.
                throw new Error("User not found after update.");
            }

            return user[0];
        });

        return updatedUser;
    } catch (error) {
        logger.error(`Error updating user with ID ${userId}:`, error);
        // @ts-expect-error h3 createError type mismatch
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }
});
