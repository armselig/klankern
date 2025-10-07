import { db } from "#server/db";
import { users, userRoles } from "#server/db/schema";
import { createUserFormSchema } from "#imports";
import { customHashPassword } from "#server/utils/password";
import { logger } from "#server/utils/logger";

export default defineEventHandler(async (event) => {
    try {
        const body = await readValidatedBody(event, (body) =>
            createUserFormSchema.parse(body),
        );

        const hashedPassword = await customHashPassword(body.password);

        const newUser = await db.transaction(async (tx) => {
            const [createdUser] = await tx
                .insert(users)
                .values({
                    email: body.email,
                    username: body.username,
                    password: hashedPassword,
                    display_name: body.display_name,
                    first_name: body.first_name,
                    last_name: body.last_name,
                })
                .returning();

            if (body.roleIds && body.roleIds.length > 0) {
                await tx.insert(userRoles).values(
                    body.roleIds.map((roleId) => ({
                        userId: createdUser.id,
                        roleId,
                    })),
                );
            }

            return createdUser;
        });

        logger.info(`User created: ${newUser.email}`);
        const { password: _, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    } catch (error: any) {
        logger.error("Error creating user:", {
            error: error.message,
            stack: error.stack,
        });

        if (error.code === "23505") {
            throw createError({
                statusCode: 409,
                statusMessage:
                    "A user with this email or username already exists.",
            });
        }

        if (error.name === "ZodError") {
            throw createError({
                statusCode: 400,
                statusMessage: "Validation failed",
                data: error.errors,
            });
        }

        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
