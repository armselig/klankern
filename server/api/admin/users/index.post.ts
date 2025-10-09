import { defineEventHandler, readValidatedBody, createError } from "h3";
import { z } from "zod";
import { createUserFormSchema } from "#imports";
import { db } from "#server/db";
import { userRoles, users } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import { customHashPassword } from "#server/utils/password";

export default defineEventHandler(async (event) => {
    logger.http(`${event.method} ${event.path}`);
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
        const userWithoutPassword = { ...newUser };
        delete userWithoutPassword.password;
        return userWithoutPassword;
    } catch (error: unknown) {
        let errorToLog: Error;
        if (error instanceof Error) {
            errorToLog = error;
        } else if (
            typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as { message: unknown }).message === "string"
        ) {
            errorToLog = new Error((error as { message: string }).message);
        } else {
            errorToLog = new Error("An unknown error occurred.");
        }
        logger.error("Error creating user:", {
            message: errorToLog.message,
            stack: errorToLog.stack,
        });

        interface DatabaseError {
            code: string;
        }

        function isDatabaseError(error: unknown): error is DatabaseError {
            return (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                typeof (error as DatabaseError).code === "string"
            );
        }

        if (isDatabaseError(error) && error.code === "23505") {
            throw createError({
                statusCode: 409,
                statusMessage:
                    "A user with this email or username already exists.",
            });
        }

        if (error instanceof z.ZodError) {
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
