import { defineEventHandler, readBody, createError } from "h3";

import bcrypt from "bcryptjs";
import { db } from "#server/db/index.ts";
import { roles, userRoles, users } from "#server/db/schema.ts";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { logger } from "#server/utils/logger";

// Define the schema for login request
const credentialsSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        const { email, password } = credentialsSchema.parse(body);

        // Find the user by email
        const userWithRoles = await db
            .select({
                id: users.id,
                email: users.email,
                password: users.password,
                roles: sql<
                    {
                        id: string;
                        name: string;
                        description: string | null;
                    }[]
                >`json_agg(json_build_object('id', ${roles.id}, 'name', ${roles.name}, 'description', ${roles.description}))`,
            })
            .from(users)
            .leftJoin(userRoles, eq(users.id, userRoles.userId))
            .leftJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(users.email, email))
            .groupBy(users.id);

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
