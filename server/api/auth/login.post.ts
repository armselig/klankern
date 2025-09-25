import { defineEventHandler, readBody, setCookie } from "h3";
import { db } from "#server/db/index.ts";
import { users, sessions } from "#server/db/schema.ts";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Define the schema for login request
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event);
        const { email, password } = loginSchema.parse(body);

        // Find the user by email
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

        if (!user) {
            throw createError({
                statusCode: 401,
                statusMessage: "Invalid credentials.",
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
                statusMessage: "Invalid credentials.",
            });
        }

        // Create a new session
        const sessionToken = crypto.randomUUID(); // Generate a UUID for the session token
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days from now

        await db.insert(sessions).values({
            userId: user.id,
            token: sessionToken,
            expiresAt,
        });

        // Set the session token as a cookie
        setCookie(event, "session_token", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: "/",
        });

        return {
            message: "Login successful!",
            user: { id: user.id, email: user.email },
        };
    } catch (error) {
        console.error("Login error:", error);
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
