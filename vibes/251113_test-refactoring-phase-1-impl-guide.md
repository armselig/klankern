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

- [ ] Create `test/utils/db.ts` for the transaction wrapper.
- [ ] Create `test/utils/fixtures.ts` for data factories.
- [ ] Create `test/utils/auth.ts` for authentication helpers.
- [ ] Create a test-only login endpoint.
- [ ] Configure Vitest `setupFiles` to use the new helpers.
- [ ] Create temporary tests for all new helper functions (withTestTransaction, db, fixtures, auth) to ensure they work as expected.

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
