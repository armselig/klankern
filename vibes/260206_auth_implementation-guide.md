# Authentication & Authorization Implementation Guide

**Date:** 2026-02-06  
**Status:** Action Required  
**Priority:** Critical Security Fix

---

## Executive Summary

A security audit revealed critical vulnerabilities in the authentication and authorization system. **All admin API endpoints are completely unprotected**, and family endpoints use an incorrect authentication pattern that prevents them from working properly.

### Key Findings

| Severity    | Issue                                          | Impact                                    |
| ----------- | ---------------------------------------------- | ----------------------------------------- |
| 🔴 Critical | Admin API endpoints have no auth checks        | Anyone can access/modify all user data    |
| 🔴 Critical | Family endpoints check wrong location for user | Auth always fails for legitimate users    |
| 🟠 High     | Client-side `useAuth()` misuse                 | Family store cannot access user data      |
| 🟡 Medium   | No server-side logout                          | Session cookies remain valid after logout |

---

## Table of Contents

1. [Root Cause Analysis](#1-root-cause-analysis)
2. [Implementation Plan](#2-implementation-plan)
3. [Phase 1: Create Auth Utilities](#3-phase-1-create-auth-utilities)
4. [Phase 2: Create Server Middleware](#4-phase-2-create-server-middleware)
5. [Phase 3: Fix Admin Endpoints](#5-phase-3-fix-admin-endpoints)
6. [Phase 4: Fix Family Endpoints](#6-phase-4-fix-family-endpoints)
7. [Phase 5: Fix Client-Side Issues](#7-phase-5-fix-client-side-issues)
8. [Phase 6: Add Logout Endpoint](#8-phase-6-add-logout-endpoint)
9. [Testing Checklist](#9-testing-checklist)
10. [Migration Notes](#10-migration-notes)

---

## 1. Root Cause Analysis

### How nuxt-auth-utils Actually Works

The `nuxt-auth-utils` module provides server-side utilities that must be explicitly called:

```typescript
// Available from "#auth" alias (configured in nuxt.config.ts)
import {
    getUserSession,
    requireUserSession,
    setUserSession,
    clearUserSession,
} from "#auth";

// getUserSession(event) - Returns session object or empty object
const session = await getUserSession(event);
// Returns: { user: { id, email, roles }, loggedInAt, id } or {}

// requireUserSession(event) - Throws 401 if no session
const session = await requireUserSession(event);
// Returns session or throws H3Error with status 401

// setUserSession(event, data) - Creates/updates session
await setUserSession(event, {
    user: { id, email, roles },
    loggedInAt: new Date(),
});

// clearUserSession(event) - Destroys session
await clearUserSession(event);
```

### What The Code Currently Does Wrong

**Wrong Pattern (current code):**

```typescript
// server/api/families/index.get.ts
const user = event.context.user; // ❌ nuxt-auth-utils does NOT populate this
if (!user) {
    throw createError({ statusCode: 401 });
}
```

**Correct Pattern:**

```typescript
// server/api/families/index.get.ts
import { requireUserSession } from "#auth";

const session = await requireUserSession(event); // ✅ Throws 401 if not authenticated
const user = session.user; // ✅ Access user from session object
```

### Why Admin Endpoints Are Vulnerable

The admin endpoints have **no authentication code at all**:

```typescript
// server/api/admin/users/index.get.ts - CURRENT (VULNERABLE)
export default defineEventHandler(async (event) => {
    // No auth check - anyone can call this!
    const usersWithRoles = await db.select()...
    return usersWithRoles;
});
```

---

## 2. Implementation Plan

### Recommended Approach: Defense in Depth

1. **Create reusable auth utilities** - DRY principle for auth checks
2. **Add server middleware** - Global protection layer as safety net
3. **Fix individual endpoints** - Explicit auth checks at handler level
4. **Fix client-side issues** - Correct composable usage

### File Changes Overview

| Action | File Path                                                   |
| ------ | ----------------------------------------------------------- |
| Create | `server/utils/auth.ts`                                      |
| Create | `server/middleware/01.auth.ts`                              |
| Create | `server/api/auth/logout.post.ts`                            |
| Modify | `server/api/admin/users/index.get.ts`                       |
| Modify | `server/api/admin/users/index.post.ts`                      |
| Modify | `server/api/admin/users/[id].get.ts`                        |
| Modify | `server/api/admin/users/[id].put.ts`                        |
| Modify | `server/api/admin/users/[id].delete.ts`                     |
| Modify | `server/api/admin/users/[id]/status.put.ts`                 |
| Modify | `server/api/admin/users/[id]/reset-password.post.ts`        |
| Modify | `server/api/admin/roles/index.get.ts`                       |
| Modify | `server/api/admin/roles/index.post.ts`                      |
| Modify | `server/api/admin/roles/[id].get.ts`                        |
| Modify | `server/api/admin/roles/[id].put.ts`                        |
| Modify | `server/api/admin/roles/[id].delete.ts`                     |
| Modify | `server/api/families/index.get.ts`                          |
| Modify | `server/api/families/index.post.ts`                         |
| Modify | `server/api/families/[id].get.ts`                           |
| Modify | `server/api/families/[id].delete.ts`                        |
| Modify | `server/api/families/[id]/transfer-ownership.post.ts`       |
| Modify | `server/api/families/[familyId]/members/index.get.ts`       |
| Modify | `server/api/families/[familyId]/members/[userId].delete.ts` |
| Modify | `server/api/families/[familyId]/invitations/index.post.ts`  |
| Modify | `server/api/invitations/index.get.ts`                       |
| Modify | `server/api/invitations/[invitationToken]/accept.post.ts`   |
| Modify | `server/api/invitations/[invitationToken]/decline.post.ts`  |
| Modify | `server/api/auth/send-verification.post.ts`                 |
| Modify | `app/stores/families.ts`                                    |
| Modify | `app/composables/useAuth.ts`                                |

---

## 3. Phase 1: Create Auth Utilities

Create reusable authentication utilities to enforce DRY principles.

### File: `server/utils/auth.ts`

````typescript
import { requireUserSession, getUserSession } from "#auth";
import { createError, type H3Event } from "h3";
import { logger } from "#server/utils/logger";

/**
 * User object structure from the session.
 * Matches what is set in credentials.post.ts
 */
export interface SessionUser {
    id: string;
    email: string;
    roles: Array<{
        id: string;
        name: string;
        description: string | null;
    }>;
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
````

---

## 4. Phase 2: Create Server Middleware

Create global middleware as a safety net. Individual handlers should still have explicit checks, but this provides defense in depth.

### File: `server/middleware/01.auth.ts`

The `01.` prefix ensures this middleware runs early in the chain.

```typescript
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
```

---

## 5. Phase 3: Fix Admin Endpoints

Even with middleware, add explicit auth checks for clarity and type safety.

### Pattern for Admin Endpoints

```typescript
import { createError, defineEventHandler } from "h3";
import { requireAdmin } from "#server/utils/auth";
import { logger } from "#server/utils/logger";
// ... other imports

export default defineEventHandler(async (event) => {
    logger.http(`${event.method} ${event.path}`);

    // Require admin role - throws 401/403 if not authorized
    const session = await requireAdmin(event);

    // Log admin action for audit trail
    logger.info(`Admin ${session.user.id} accessing: ${event.path}`);

    try {
        // ... existing handler logic
    } catch (error: unknown) {
        // ... existing error handling
    }
});
```

### Files to Update

Apply the pattern above to each file. Add these imports at the top:

```typescript
import { requireAdmin } from "#server/utils/auth";
```

Add this as the first line inside the handler:

```typescript
const session = await requireAdmin(event);
```

**Files:**

- `server/api/admin/users/index.get.ts`
- `server/api/admin/users/index.post.ts`
- `server/api/admin/users/[id].get.ts`
- `server/api/admin/users/[id].put.ts`
- `server/api/admin/users/[id].delete.ts`
- `server/api/admin/users/[id]/status.put.ts`
- `server/api/admin/users/[id]/reset-password.post.ts`
- `server/api/admin/roles/index.get.ts`
- `server/api/admin/roles/index.post.ts`
- `server/api/admin/roles/[id].get.ts`
- `server/api/admin/roles/[id].put.ts`
- `server/api/admin/roles/[id].delete.ts`

---

## 6. Phase 4: Fix Family Endpoints

Replace the incorrect `event.context.user` pattern with proper auth utilities.

### Before (Current - Broken)

```typescript
export default defineEventHandler(async (event) => {
    const user = event.context.user; // ❌ Never populated

    if (!user) {
        throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }

    // ... rest of handler using user.id
});
```

### After (Fixed)

```typescript
import { requireAuth } from "#server/utils/auth";

export default defineEventHandler(async (event) => {
    const session = await requireAuth(event); // ✅ Properly gets session
    const user = session.user; // ✅ Typed user object

    // ... rest of handler using user.id
});
```

### Files to Update

Apply the transformation to each file:

1. Add import: `import { requireAuth } from "#server/utils/auth";`
2. Replace: `const user = event.context.user;` with `const session = await requireAuth(event); const user = session.user;`
3. Remove the manual `if (!user)` check (requireAuth throws automatically)

**Files:**

- `server/api/families/index.get.ts`
- `server/api/families/index.post.ts`
- `server/api/families/[id].get.ts`
- `server/api/families/[id].delete.ts`
- `server/api/families/[id]/transfer-ownership.post.ts`
- `server/api/families/[familyId]/members/index.get.ts`
- `server/api/families/[familyId]/members/[userId].delete.ts`
- `server/api/families/[familyId]/invitations/index.post.ts`
- `server/api/invitations/index.get.ts`
- `server/api/invitations/[invitationToken]/accept.post.ts`
- `server/api/invitations/[invitationToken]/decline.post.ts`
- `server/api/auth/send-verification.post.ts`

### Example: `server/api/families/index.get.ts`

```typescript
import { defineEventHandler, createError } from "h3";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "#server/utils/auth";
import { db } from "#server/db";
import { familyMembers } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import { notDeleted } from "#server/db/helpers";

/**
 * @api {get} /api/families
 * @description Fetches all families the authenticated user is a member of.
 * @returns {Promise<object[]>} An array of family objects.
 */
export default defineEventHandler(async (event) => {
    // Require authentication - throws 401 if not logged in
    const session = await requireAuth(event);
    const user = session.user;

    try {
        const userFamilyMemberships = await db.query.familyMembers.findMany({
            where: and(
                eq(familyMembers.user_id, user.id),
                notDeleted(familyMembers),
            ),
            with: {
                family: true,
            },
        });

        const families = userFamilyMemberships
            .map((membership) => membership.family)
            .filter((family) => family && !family.deleted_at);

        return families;
    } catch (error) {
        logger.error(`Error fetching families for user ${user.id}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }
});
```

---

## 7. Phase 5: Fix Client-Side Issues

### Fix 1: `app/stores/families.ts`

**Line 36 - Wrong composable usage:**

```typescript
// BEFORE (line 3 and 36):
import { useAuth } from "~/composables/useAuth";
// ...
const { user: authUser } = useAuth(); // ❌ useAuth() returns { login, logout }

// AFTER:
import { useUserSession } from "#imports";
// ...
const { user: authUser } = useUserSession(); // ✅ Returns { loggedIn, user, fetch, clear }
```

### Fix 2: `app/composables/useAuth.ts` (Enhancement)

Update to also expose user data for convenience:

```typescript
import { navigateTo, useLogger, useUserSession } from "#imports";
import type { LoginCredentials } from "#shared/types/auth";

/**
 * @file Composable for handling authentication logic.
 * @description This composable centralizes the login and logout functionalities,
 * providing a clean and reusable way to manage authentication-related API calls and session handling.
 */
export const useAuth = () => {
    const {
        fetch: refreshSession,
        clear: clearSession,
        loggedIn,
        user,
    } = useUserSession();
    const logger = useLogger();

    /**
     * Attempts to log the user in with the provided credentials.
     * On success, it refreshes the session and navigates to the admin page.
     * @param credentials The user's login credentials.
     */
    const login = async (credentials: LoginCredentials) => {
        try {
            await $fetch("/api/auth/credentials", {
                method: "POST",
                body: credentials,
            });
            await refreshSession();
            return navigateTo("/admin/users");
        } catch (error) {
            logger.error("Login error:", { error });
            throw error;
        }
    };

    /**
     * Logs the user out by clearing the session server-side and client-side,
     * then redirects to the home page.
     */
    const logout = async () => {
        try {
            // Clear server-side session first
            await $fetch("/api/auth/logout", { method: "POST" });
        } catch (error) {
            // Log but don't block logout if server call fails
            logger.warn("Server logout failed, clearing client session:", {
                error,
            });
        }
        await clearSession();
        await navigateTo("/");
    };

    return {
        login,
        logout,
        // Expose session state for convenience (prefer useUserSession() directly for reactivity)
        loggedIn,
        user,
    };
};
```

---

## 8. Phase 6: Add Logout Endpoint

Create a server-side logout endpoint to properly invalidate sessions.

### File: `server/api/auth/logout.post.ts`

```typescript
import { defineEventHandler } from "h3";
import { clearUserSession, getUserSession } from "#auth";
import { logger } from "#server/utils/logger";

/**
 * @api {post} /api/auth/logout
 * @description Logs the user out by clearing the server-side session.
 * @returns {{ message: string }} Success message
 */
export default defineEventHandler(async (event) => {
    logger.http(`${event.method} ${event.path}`);

    const session = await getUserSession(event);

    if (session.user) {
        logger.info(`User ${session.user.id} logging out`);
    }

    await clearUserSession(event);

    return { message: "Logged out successfully" };
});
```

---

## 9. Testing Checklist

### Manual Testing

#### Authentication Tests

- [ ] **Login works**: POST `/api/auth/credentials` with valid credentials returns 200
- [ ] **Login fails**: POST `/api/auth/credentials` with invalid credentials returns 401
- [ ] **Session persists**: After login, subsequent requests are authenticated
- [ ] **Logout works**: POST `/api/auth/logout` clears session
- [ ] **Session cleared**: After logout, protected routes return 401

#### Admin Endpoint Tests

- [ ] **Unauthenticated**: GET `/api/admin/users` returns 401 without session
- [ ] **Non-admin**: GET `/api/admin/users` returns 403 for non-admin user
- [ ] **Admin access**: GET `/api/admin/users` returns 200 for admin user
- [ ] **All admin endpoints**: Repeat above for all `/api/admin/*` endpoints

#### Family Endpoint Tests

- [ ] **Unauthenticated**: GET `/api/families` returns 401 without session
- [ ] **Authenticated**: GET `/api/families` returns 200 with session
- [ ] **Own families only**: GET `/api/families` returns only user's families
- [ ] **Manager actions**: DELETE `/api/families/[id]` only works for managers

### Automated Tests

Create test files in `test/nuxt/api/`:

```typescript
// test/nuxt/api/admin-auth.spec.ts
import { describe, it, expect } from "vitest";
import { $fetch } from "@nuxt/test-utils";

describe("Admin API Authentication", () => {
    it("returns 401 for unauthenticated requests", async () => {
        await expect($fetch("/api/admin/users")).rejects.toMatchObject({
            statusCode: 401,
        });
    });

    it("returns 403 for non-admin users", async () => {
        // Login as non-admin user first
        // Then attempt admin endpoint
    });

    it("returns 200 for admin users", async () => {
        // Login as admin user first
        // Then access admin endpoint
    });
});
```

---

## 10. Migration Notes

### Breaking Changes

1. **API responses may change**: Endpoints that previously returned data will now return 401/403
2. **Client must handle auth errors**: Update error handling to redirect on 401

### Rollback Plan

If issues arise:

1. Remove `server/middleware/01.auth.ts` to disable global middleware
2. Revert individual endpoint changes
3. Auth utilities in `server/utils/auth.ts` can remain (unused is harmless)

### Deployment Checklist

- [ ] Ensure `NUXT_SESSION_PASSWORD` environment variable is set in production
- [ ] Test login flow in staging environment
- [ ] Verify admin users have correct roles in database
- [ ] Monitor error logs for unexpected 401/403 responses after deployment

---

## Appendix: Quick Reference

### Auth Utility Functions

| Function                   | Returns               | Throws   | Use Case                           |
| -------------------------- | --------------------- | -------- | ---------------------------------- |
| `requireAuth(event)`       | `UserSession`         | 401      | Any protected endpoint             |
| `requireAdmin(event)`      | `UserSession`         | 401, 403 | Admin-only endpoints               |
| `requireRole(event, role)` | `UserSession`         | 401, 403 | Role-specific endpoints            |
| `getOptionalAuth(event)`   | `UserSession \| null` | Never    | Optional auth (public with extras) |
| `hasRole(event, role)`     | `boolean`             | Never    | Conditional logic                  |

### Common Patterns

```typescript
// Require any authenticated user
const session = await requireAuth(event);
const userId = session.user.id;

// Require admin
const session = await requireAdmin(event);

// Require specific role
const session = await requireRole(event, "moderator");

// Optional auth (e.g., public endpoint with user-specific extras)
const session = await getOptionalAuth(event);
if (session) {
    // Include user-specific data
}

// Check role without throwing
if (await hasRole(event, "premium")) {
    // Include premium features
}
```
