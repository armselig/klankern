import { defineEventHandler, readBody, createError } from "h3";

import bcrypt from "bcryptjs";
import { db } from "#server/db/index.ts";
import { users } from "#server/db/schema.ts";
import { eq } from "drizzle-orm";
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
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

        if (!user) {
            throw createError({
                statusCode: 401,
                message: "Invalid credentials",
            });
        }

        // Compare provided password with hashed password
        const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash,
        );

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
