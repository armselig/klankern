import { getUserSession } from "#auth";
import { createError, defineEventHandler } from "h3";
import { logger } from "#server/utils/logger";

/**
 * Global authentication middleware.
 *
 * Provides defense-in-depth by enforcing auth at the middleware level.
 * Individual handlers should STILL have explicit auth checks for:
 * - Role-based authorization
 * - Resource-based authorization (e.g., family membership)
 *
 * This middleware:
 * - Allows public endpoints (auth, health, test)
 * - Requires authentication for all /api/* routes
 * - Requires admin role for all /api/admin/* routes
 * - Populates event.context.user for convenience (optional use)
 */
export default defineEventHandler(async (event) => {
    const path = event.path;

    // Skip non-API routes (pages, assets, etc.)
    if (!path.startsWith("/api/")) {
        return;
    }

    // Public endpoints - no auth required
    const publicPaths = [
        "/api/auth/credentials", // Login endpoint
        "/api/auth/logout", // Logout endpoint (should work even with expired session)
        "/api/auth/verify-email", // Email verification (token-based)
        "/api/health", // Health check
    ];

    if (publicPaths.some((p) => path === p)) {
        return;
    }

    // Test endpoints - only in test environment
    if (path.startsWith("/api/__test__/")) {
        if (process.env.NODE_ENV !== "test") {
            throw createError({
                statusCode: 404,
                statusMessage: "Not Found",
            });
        }
        return;
    }

    // All other API routes require authentication
    const session = await getUserSession(event);

    if (!session.user) {
        logger.debug(`Unauthenticated request to protected endpoint: ${path}`);
        throw createError({
            statusCode: 401,
            statusMessage: "Unauthorized: Authentication required",
        });
    }

    // Admin routes require admin role
    if (path.startsWith("/api/admin/")) {
        const isAdmin = session.user.roles?.some(
            (role: { name: string }) => role.name === "admin",
        );

        if (!isAdmin) {
            logger.warn(
                `Non-admin user ${session.user.id} attempted admin access: ${path}`,
            );
            throw createError({
                statusCode: 403,
                statusMessage: "Forbidden: Admin access required",
            });
        }
    }

    // Populate event.context.user for convenience
    // Note: Handlers should still use requireAuth() for type safety
    event.context.user = session.user;
    event.context.session = session;
});
