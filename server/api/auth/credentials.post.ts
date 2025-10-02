import { defineEventHandler, readBody, createError } from "h3";

import bcrypt from "bcryptjs";
import { db } from "#server/db/index.ts";
import { getUserWithRolesByEmail } from "#server/db/utils";
import { z } from "zod";

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        const { email, password } = loginCredentialsSchema.parse(body);

        // Find the user by email
        const userWithRoles = await getUserWithRolesByEmail(email);

        if (!userWithRoles || userWithRoles.length === 0) {
            throw createError({
                statusCode: 401,
                message: "Invalid credentials",
            });
        }

        const user = userWithRoles[0];
        const userRolesData =
            user.roles && user.roles.length > 0 && user.roles[0].id !== null
                ? user.roles
                : [];

        if (!user) {
            throw createError({
                statusCode: 401,
                message: "Invalid credentials",
            });
        }

        // Compare provided password with hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw createError({
                statusCode: 401,
                message: "Invalid credentials",
            });
        }

        // Set the user session
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
        logger.error("Login error:", error);
        if (error instanceof z.ZodError) {
            throw createError({
                statusCode: 400,
                statusMessage: "Validation failed.",
                data: error.issues,
            });
        }
        throw createError({
            statusCode: 500,
            statusMessage: "Failed to log in.",
        });
    }
});
