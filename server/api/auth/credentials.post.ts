import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { getUserWithRolesByEmail } from "#server/db/utils";
import { logger } from "#server/utils/logger";
import { verifyPassword } from "#imports";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        const { email, password } = loginCredentialsSchema.parse(body);

        const userWithRoles = await getUserWithRolesByEmail(email);

        if (!userWithRoles || userWithRoles.length === 0) {
            throw createError({
                statusCode: 401,
                statusMessage: "Invalid credentials",
            });
        }

        const user = userWithRoles[0];
        const userRolesData =
            user.roles && user.roles.length > 0 && user.roles[0].id !== null
                ? user.roles
                : [];

        const isPasswordValid = await verifyPassword(password, user.password);

        if (!isPasswordValid) {
            throw createError({
                statusCode: 401,
                statusMessage: "Invalid credentials",
            });
        }

        await setUserSession(event, {
            user: {
                id: user.id,
                email: user.email,
                roles: userRolesData,
            },
            loggedInAt: new Date(),
        });

        return { message: "Login successful" };
    } catch (error) {
        if (error instanceof z.ZodError) {
            logger.debug("Validation failed for login credentials", { error });
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid input. Please check your credentials.",
                data: error.issues,
            });
        }

        // If the error is a 401 error we created, just re-throw it
        if ((error as any).statusCode === 401) {
            throw error;
        }

        logger.error("An unexpected error occurred during login", { error });
        throw createError({
            statusCode: 500,
            statusMessage:
                "An unexpected error occurred. Please try again later.",
        });
    }
});
