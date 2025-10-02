import { defineEventHandler, readBody } from "h3";
import bcrypt from "bcryptjs";
import { db } from "#server/db";
import { users, userRoles } from "#server/db/schema";
import { logger } from "#server/utils/logger";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    const validation = newUserSchema.safeParse(body);
    if (!validation.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid user data",
            data: validation.error.errors,
        });
    }

    const { email, username, password, display_name, first_name, last_name } =
        validation.data;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await db.transaction(async (tx) => {
            const [createdUser] = await tx
                .insert(users)
                .values({
                    email,
                    username,
                    password: hashedPassword,
                    display_name,
                    first_name,
                    last_name,
                })
                .returning();

            const userRole = await tx.query.roles.findFirst({
                where: (roles, { eq }) => eq(roles.name, "user"),
            });

            if (!userRole) {
                logger.error("Default 'user' role not found.");
                throw new Error("Default 'user' role not found.");
            }

            await tx.insert(userRoles).values({
                userId: createdUser.id,
                roleId: userRole.id,
            });

            return createdUser;
        });

        const { password: _, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    } catch (error: unknown) {
        logger.error("Error creating user:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }
});
