import { createTestUser } from "./fixtures";
import type { TestTransaction } from "./db";
import { users } from "~~/server/db/schema";

/**
 * Simulates a login for a given user ID and returns auth headers.
 *
 * @param userId - The ID of the user to log in as.
 * @returns An object containing the authentication headers for API requests.
 */
export async function loginAs(userId: string) {
    // This will create a session cookie which is automatically attached
    // to subsequent $fetch requests.
    await $fetch("/api/test/login", {
        method: "POST",
        body: { userId },
    });

    // If your auth uses headers, you would return them here.
    // For cookie-based sessions, this might not be necessary, but
    // returning it is good practice.
    return {
        headers: {
            // Example: 'Authorization': `Bearer ${token}`
            // For nuxt-auth-utils, the cookie is handled automatically.
        },
    };
}

/**
 * A convenience helper to create a user and log in as them in one step.
 */
export async function createAndLoginUser(
    tx: TestTransaction,
    userData: Partial<typeof users.$inferInsert> = {},
) {
    const user = await createTestUser(tx, userData);
    const auth = await loginAs(user.id);
    return { user, auth };
}
