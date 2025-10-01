import { defineEventHandler, readBody } from "h3";
import { z } from "zod";
import { db } from "#server/db";
import { users, userRoles } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import { eq } from "drizzle-orm";

/**
 * @file API endpoint to update a user's details.
 * @description This endpoint handles updating user information, including their roles.
 * It uses a transaction to ensure that user details and role assignments are updated atomically.
 */

const updateUserSchema = z.object({
    email: z.string().email().optional(),
    username: z.string().min(3).optional(),
    display_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    is_active: z.boolean().optional(),
    roleIds: z.array(z.string().uuid()).optional(),
});

interface UserUpdatePayload {
    email?: string;
    username?: string;
    display_name?: string;
    first_name?: string;
    last_name?: string;
    is_active?: boolean;
    roleIds?: string[];
}

export default defineEventHandler(async (event) => {
    const userId = event.context.params?.id;
    if (!userId) {
        throw createError({
            statusCode: 400,
            statusMessage: "User ID is required",
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

    const { roleIds, ...userDetails } = validation.data;

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
                    .where(eq(users.id, userId));
            }

            if (roleIds) {
                // This is a full replacement of roles. We first delete all existing roles
                // for the user and then insert the new ones.
                await tx.delete(userRoles).where(eq(userRoles.userId, userId));
                if (roleIds.length > 0) {
                    await tx.insert(userRoles).values(
                        roleIds.map((roleId) => ({
                            userId: userId,
                            roleId: roleId,
                        })),
                    );
                }
            }

            // Fetch the user again to return the updated data, including relations.
            const user = await tx.query.users.findFirst({
                where: eq(users.id, userId),
                with: {
                    userRoles: {
                        with: {
                            role: true,
                        },
                    },
                },
            });

            if (!user) {
                // This should theoretically not happen if the initial user ID was valid.
                throw new Error("User not found after update.");
            }

            return user;
        });

        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    } catch (error) {
        logger.error(`Error updating user with ID ${userId}:`, error);
        // @ts-ignore
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }
});
