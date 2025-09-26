import { defineEventHandler, getCookie, createError } from "h3";
import { db } from "#server/db/index.ts";
import { sessions, users, roles } from "#server/db/schema.ts"; // Added roles import
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    const publicRoutes = [
        "/api/auth/login",
        "/api/auth/register",
        "/auth/login",
    ]; // Example public routes

    // Skip auth for public routes
    if (publicRoutes.some((route) => event.path.startsWith(route))) {
        return;
    }

    const adminRoutes = ["/api/admin"]; // Routes that require admin role

    const sessionToken = getCookie(event, "session_token");

    if (!sessionToken) {
        throw createError({
            statusCode: 401,
            statusMessage: "Unauthorized: No session token provided.",
        });
    }

    const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, sessionToken));

    if (!session || session.expiresAt < new Date()) {
        throw createError({
            statusCode: 401,
            statusMessage: "Unauthorized: Invalid or expired session token.",
        });
    }

    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId));

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Unauthorized: User not found.",
        });
    }

    // Attach user to event context for later use in handlers
    event.context.user = user;

    // Check for admin role if accessing admin routes
    if (adminRoutes.some((route) => event.path.startsWith(route))) {
        const [role] = await db
            .select()
            .from(roles)
            .where(eq(roles.id, user.roleId));
        if (!role || role.name !== "admin") {
            throw createError({
                statusCode: 403,
                statusMessage: "Forbidden: Admin access required.",
            });
        }
    }
});
