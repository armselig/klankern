import { requireUserSession, getUserSession } from "#auth";
import { createError, type H3Event } from "h3";
import { logger } from "#server/utils/logger";

/**
 * User object structure from the session.
 * Matches what is set in credentials.post.ts and register.post.ts
 */
export interface SessionUser {
    id: string;
    email: string;
    roles: Array<{
        id: string;
        name: string;
        description: string | null;
    }>;
    families: Array<{ id: string; name: string }>;
    emailVerified: boolean;
}

/**
 * Session object structure from nuxt-auth-utils.
 */
export interface UserSession {
    user: SessionUser;
    loggedInAt: Date;
    id?: string;
}

/**
 * Requires the user to be authenticated.
 * Throws 401 Unauthorized if no valid session exists.
 *
 * @param event - The H3 event object
 * @returns The user session with typed user object
 * @throws H3Error with status 401 if not authenticated
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *     const session = await requireAuth(event);
 *     const userId = session.user.id;
 *     // ... handler logic
 * });
 * ```
 */
export async function requireAuth(event: H3Event): Promise<UserSession> {
    const session = await requireUserSession(event);
    return session as UserSession;
}

/**
 * Requires the user to be authenticated AND have the admin role.
 * Throws 401 if not authenticated, 403 if not admin.
 *
 * @param event - The H3 event object
 * @returns The user session with typed user object
 * @throws H3Error with status 401 if not authenticated
 * @throws H3Error with status 403 if not admin
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *     const session = await requireAdmin(event);
 *     // Only admins reach this point
 *     // ... admin-only logic
 * });
 * ```
 */
export async function requireAdmin(event: H3Event): Promise<UserSession> {
    const session = await requireAuth(event);

    const isAdmin = session.user.roles?.some((role) => role.name === "admin");

    if (!isAdmin) {
        logger.warn(
            `Non-admin user ${session.user.id} attempted to access admin endpoint: ${event.path}`,
        );
        throw createError({
            statusCode: 403,
            statusMessage: "Forbidden: Admin access required",
        });
    }

    return session;
}

/**
 * Requires the user to be authenticated AND have a specific role.
 * Throws 401 if not authenticated, 403 if missing required role.
 *
 * @param event - The H3 event object
 * @param roleName - The required role name
 * @returns The user session with typed user object
 * @throws H3Error with status 401 if not authenticated
 * @throws H3Error with status 403 if missing required role
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *     const session = await requireRole(event, "moderator");
 *     // Only users with moderator role reach this point
 * });
 * ```
 */
export async function requireRole(
    event: H3Event,
    roleName: string,
): Promise<UserSession> {
    const session = await requireAuth(event);

    const hasRole = session.user.roles?.some((role) => role.name === roleName);

    if (!hasRole) {
        logger.warn(
            `User ${session.user.id} missing required role '${roleName}' for: ${event.path}`,
        );
        throw createError({
            statusCode: 403,
            statusMessage: `Forbidden: ${roleName} access required`,
        });
    }

    return session;
}

/**
 * Gets the current user session without requiring authentication.
 * Returns null if no session exists.
 *
 * @param event - The H3 event object
 * @returns The user session or null if not authenticated
 *
 * @example
 * ```typescript
 * export default defineEventHandler(async (event) => {
 *     const session = await getOptionalAuth(event);
 *     if (session) {
 *         // User is logged in
 *     } else {
 *         // Anonymous user
 *     }
 * });
 * ```
 */
export async function getOptionalAuth(
    event: H3Event,
): Promise<UserSession | null> {
    const session = await getUserSession(event);
    if (!session.user) {
        return null;
    }
    return session as UserSession;
}

/**
 * Checks if the current user has a specific role.
 * Does not throw - returns boolean.
 *
 * @param event - The H3 event object
 * @param roleName - The role name to check
 * @returns True if user has the role, false otherwise
 */
export async function hasRole(
    event: H3Event,
    roleName: string,
): Promise<boolean> {
    const session = await getOptionalAuth(event);
    if (!session) {
        return false;
    }
    return session.user.roles?.some((role) => role.name === roleName) ?? false;
}
