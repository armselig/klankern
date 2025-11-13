---
title: "Phase 1 Implementation Guide: Test Suite Foundation"
date: 2025-11-13
tags:
    - testing
    - refactoring
    - tdd
    - database
    - implementation-guide
references:
    - "vibes/251113_test-refactoring-plan.md"
---

## Phase 1 Implementation Guide: Test Suite Foundation

This document provides a detailed, step-by-step guide for implementing Phase 1 of the [Test Suite Refactoring & Optimization Plan](./251113_test-refactoring-plan.md).

The goal of this phase is to build the foundational components required for running isolated, transaction-based tests against a real database.

### Checklist

- [x] Create `test/utils/db.ts` for the transaction wrapper.
- [x] Create `test/utils/fixtures.ts` for data factories.
- [x] Create `test/utils/auth.ts` for authentication helpers.
- [x] Create a test-only login endpoint.
- [x] Configure Vitest `setupFiles` to use the new helpers.
- [x] Create temporary tests for all new helper functions (withTestTransaction, db, fixtures, auth) to ensure they work as expected.

**Status:** ✅ Phase 1 Complete (2025-11-13)

- All files created and pass typecheck
- All files pass linter
- Comprehensive test suite created in `test/nuxt/utils.spec.ts`
- **All 125 tests passing** (4 Phase 1 tests + 121 existing tests)

### Critical Learnings & Implementation Notes

**1. Drizzle Transaction Rollback Handling**

- Calling `tx.rollback()` throws a `DrizzleError` with message "Rollback"
- This is expected behavior - must catch and ignore this specific error
- Implementation pattern:

```typescript
try {
    await db.transaction(async (tx) => {
        await testFn(tx);
        tx.rollback(); // Throws "Rollback" error
    });
} catch (error) {
    if (error instanceof Error && error.message !== "Rollback") {
        throw error; // Re-throw non-rollback errors
    }
}
```

**2. Environment Variable Configuration**

- `.env.test` must use `override: true` in dotenv config to override `.env` values
- Critical for database host: `.env` has `DB_HOST=db` (Docker), `.env.test` needs `DB_HOST=localhost`
- `NODE_ENV=test` must be set both in `.env.test` and `vitest.config.ts` env property
- Configuration in `vitest.config.ts:6`:

```typescript
dotenv.config({ path: ".env.test", override: true });
```

**3. Schema Type Safety**

- Use Drizzle's `$inferInsert` type instead of custom types
- Example: `typeof users.$inferInsert` provides correct insert types
- Ensures fixtures match actual database schema
- Prevents field name mismatches (e.g., `name` vs `username`, `passwordHash` vs `password`)

**4. Test Data Uniqueness**

- Always use timestamps for unique values: `username: \`testuser${Date.now()}\``
- Prevents conflicts from previous test runs where rollback may have failed
- Critical for email and username fields with unique constraints

**5. Mock Management**

- Old global mocks in `test/setup.ts` removed for cleaner Phase 1 implementation
- Tests needing mocks should define them locally in the test file
- Pattern: Define mock function and vi.mock() at top of test file

**6. Test Endpoint Security**

- `/api/test/login` endpoint checks `NODE_ENV !== 'test'` and returns 404 in production
- Only available when `NODE_ENV=test` is properly configured
- Prevents accidental exposure of test-only authentication bypass in production

---

### 1. Database Transaction Wrapper (`withTestTransaction`)

This utility will be the cornerstone of our new testing strategy. It ensures every test runs in an isolated database transaction that is automatically rolled back.

**File:** `test/utils/db.ts`

```typescript
import { db } from "~/server/db";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import * as schema from "~/server/db/schema";

// Define a type for our transaction object to ensure type safety
export type TestTransaction = PgTransaction<
    PostgresJsQueryResultHKT,
    typeof schema,
    ExtractTablesWithRelations<typeof schema>
>;

/**
 * Wraps a test function in a database transaction and automatically rolls it back.
 *
 * @param testFn - The test function to execute, which receives the transaction object.
 * @returns A promise that resolves when the test function completes.
 */
export async function withTestTransaction(
    testFn: (tx: TestTransaction) => Promise<void>,
): Promise<void> {
    await db.transaction(async (tx) => {
        try {
            await testFn(tx as TestTransaction);
        } finally {
            // Roll back the transaction after the test is complete
            await tx.rollback();
        }
    });
}
```

**Usage Example (in a test file):**

```typescript
import { withTestTransaction } from "#test/utils/db";

it("should create and then not find a user", async () => {
    let userId: string;

    await withTestTransaction(async (tx) => {
        const newUser = await tx
            .insert(schema.users)
            .values({ name: "Test" })
            .returning();
        userId = newUser[0].id;
        const userInDb = await tx.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, userId),
        });
        expect(userInDb).toBeDefined();
    });

    // Outside the transaction, the user should not exist
    const userAfterRollback = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, userId),
    });
    expect(userAfterRollback).toBeUndefined();
});
```

---

### 2. Fixture Factories

Fixture factories will simplify the creation of test data within our transactions.

**File:** `test/utils/fixtures.ts`

```typescript
import { users, families, familyMembers } from "~/server/db/schema";
import type { TestTransaction } from "./db";
import type { NewUser, NewFamily } from "~/shared/types";

// User Fixture
export async function createTestUser(
    tx: TestTransaction,
    userData: Partial<NewUser> = {},
) {
    const defaultUser: NewUser = {
        email: `test-${Date.now()}@example.com`,
        name: "Test User",
        passwordHash: "hashedpassword", // Use a fixed hash for tests
        ...userData,
    };
    const [user] = await tx.insert(users).values(defaultUser).returning();
    return user;
}

// Family Fixture
export async function createTestFamily(
    tx: TestTransaction,
    familyData: Partial<NewFamily> = {},
    ownerId: string,
) {
    const defaultFamily: NewFamily = {
        name: "The Test Family",
        ...familyData,
    };
    const [family] = await tx
        .insert(families)
        .values(defaultFamily)
        .returning();

    // Automatically create the owner's membership
    await tx.insert(familyMembers).values({
        familyId: family.id,
        userId: ownerId,
        role: "manager",
    });

    return family;
}
```

---

### 3. Authentication Helpers & Test-Only Endpoint

To test protected API routes, we need a way to simulate authenticated users without the overhead of a full login flow.

#### a. Test-Only Login Endpoint

This endpoint will only be available in `test` environments. It creates a session for a given `userId`.

**File:** `server/api/test/login.post.ts`

```typescript
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
    // Ensure this endpoint is only available in test mode
    if (process.env.NODE_ENV !== "test") {
        throw createError({
            statusCode: 404,
            statusMessage: "Not Found",
        });
    }

    const { userId } = await readBody(event);
    if (!userId) {
        throw createError({ statusCode: 400, message: "userId is required" });
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user) {
        throw createError({ statusCode: 404, message: "User not found" });
    }

    // Create a session for the user
    // NOTE: This depends on the actual implementation of your auth system.
    // This is a placeholder for `nuxt-auth-utils` or similar.
    const session = {
        user: { id: user.id, name: user.name, email: user.email },
    };
    await setUserSession(event, session);

    return { message: `Session created for user ${userId}` };
});
```

#### b. Authentication Helper (`loginAs`)

This helper function will call our new test endpoint.

**File:** `test/utils/auth.ts`

```typescript
import { createTestUser } from "./fixtures";
import type { TestTransaction } from "./db";

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
    userData: Partial<NewUser> = {},
) {
    const user = await createTestUser(tx, userData);
    const auth = await loginAs(user.id);
    return { user, auth };
}
```

---

### 4. Vitest Configuration

Finally, let's update our Vitest config to make these utilities globally available.

**File:** `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
    // ... other config
    plugins: [vue()],
    test: {
        // ... other test config
        setupFiles: [
            "./test/setup.ts", // Ensure you have a setup file
        ],
        globals: true,
    },
    resolve: {
        alias: {
            "~": resolve(__dirname, "."),
            "#test": resolve(__dirname, "./test"), // Add alias for test utilities
        },
    },
});
```

**File:** `test/setup.ts`

This file is a good place to add any global setup, though for now, just ensuring it exists is enough. We can add global hooks here later if needed.

```typescript
import { beforeAll, afterAll } from "vitest";

beforeAll(() => {
    // Runs once before all tests
    console.log("Starting test suite...");
});

afterAll(() => {
    // Runs once after all tests
    console.log("Test suite finished.");
});
```

With these pieces in place, Phase 1 is complete. We are now ready to start converting existing tests to use this new, robust foundation.
