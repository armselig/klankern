# Phase 2 Implementation Guide: Convert Tests to Real Database Transactions

**Branch:** `refactor/test-suite`
**Prerequisites:** Phase 1 completed (✅ all infrastructure in place)
**Estimated Time:** 1-2 weeks
**Goal:** Replace all mocked API tests with real database transactions and actual endpoint calls

---

## Overview

Phase 1 successfully created the infrastructure:

- ✅ `withTestTransaction()` wrapper for automatic rollback
- ✅ `createTestUser()` and `createTestFamily()` fixtures
- ✅ `loginAs()` and `createAndLoginUser()` auth helpers
- ✅ Test-only `/api/test/login` endpoint

Phase 2 will now convert all existing API tests to use this infrastructure instead of mocks.

---

## Files to Convert

### API Test Files (7 files, 36 tests total)

| File                                                | Tests | Current Approach                                        | Issues                        |
| --------------------------------------------------- | ----- | ------------------------------------------------------- | ----------------------------- |
| `test/nuxt/api/families.spec.ts`                    | 5     | `registerEndpoint()` + `vi.mock(db)`                    | Mocked DB, no real validation |
| `test/nuxt/api/families/invitations.spec.ts`        | 4     | `registerEndpoint()` + `vi.mock(db)` + `vi.mock(email)` | Mocked DB, mocked email       |
| `test/nuxt/api/families/transfer-ownership.spec.ts` | 5     | `registerEndpoint()`                                    | No DB validation              |
| `test/nuxt/api/auth/email-verification.spec.ts`     | 7     | `registerEndpoint()`                                    | No DB validation              |
| `test/nuxt/api/admin/users.spec.ts`                 | 7     | `registerEndpoint()`                                    | No real RBAC testing          |
| `test/nuxt/api/admin/roles.spec.ts`                 | 3     | `registerEndpoint()`                                    | No DB validation              |
| `test/nuxt/api/soft-delete-helpers.spec.ts`         | 5     | Unit test (OK)                                          | ✅ Already a proper unit test |

### Mock Removals

**Remove these `vi.mock()` calls:**

- ❌ `vi.mock("#server/db")` in `families.spec.ts`
- ❌ `vi.mock("#server/db")` in `invitations.spec.ts`

**Keep these mocks (external services):**

- ✅ `vi.mock("~/server/utils/email-sender")` in `invitations.spec.ts`

---

## Implementation Strategy

### Step 1: Convert One File as Template

**Start with:** `test/nuxt/api/families.spec.ts` (5 tests)

This will establish the pattern for all other conversions.

#### Before (Current Pattern):

```typescript
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { vi } from "vitest";

const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ id: "new-family-id" }]),
};

vi.mock("#server/db", () => ({ db: mockDb }));

describe("POST /api/families", () => {
    it("should return 401 for unauthenticated users", async () => {
        registerEndpoint("/api/families", {
            method: "POST",
            handler: (event) => {
                if (!event.context.user) {
                    throw createError({ statusCode: 401 });
                }
                return {};
            },
        });

        await expect(
            $fetch("/api/families", { method: "POST", body: { name: "Test" } }),
        ).rejects.toMatchObject({ statusCode: 401 });
    });
});
```

#### After (Target Pattern):

```typescript
import { describe, expect, it } from "vitest";
import { withTestTransaction, createAndLoginUser } from "#test/utils";
import { eq } from "drizzle-orm";
import { families, familyMembers } from "~/server/db/schema";

describe("POST /api/families", () => {
    it("should return 401 for unauthenticated users", async () => {
        await withTestTransaction(async () => {
            // No authentication setup - test unauthenticated access
            await expect(
                $fetch("/api/families", {
                    method: "POST",
                    body: { name: "Test Family" },
                }),
            ).rejects.toMatchObject({
                statusCode: 401,
            });
        });
    });

    it("should create a family and verify database state", async () => {
        await withTestTransaction(async (tx) => {
            // 1. Setup: Create and authenticate a user
            const { user } = await createAndLoginUser(tx, {
                email: "test@example.com",
                username: "testuser",
            });

            // 2. Action: Make the actual API request
            const familyName = "My Test Family";
            const response = await $fetch("/api/families", {
                method: "POST",
                body: { name: familyName },
            });

            // 3. Assertion: Verify API response
            expect(response).toBeDefined();
            expect(response.name).toBe(familyName);
            expect(response.id).toBeDefined();

            // 4. Assertion: Verify database state directly
            const createdFamily = await tx.query.families.findFirst({
                where: eq(families.id, response.id),
            });
            expect(createdFamily).toBeDefined();
            expect(createdFamily?.name).toBe(familyName);
            expect(createdFamily?.creator_id).toBe(user.id);

            // 5. Assertion: Verify family membership was created
            const membership = await tx.query.familyMembers.findFirst({
                where: (members, { and, eq }) =>
                    and(
                        eq(members.family_id, createdFamily!.id),
                        eq(members.user_id, user.id),
                    ),
            });
            expect(membership).toBeDefined();
            expect(membership?.role).toBe("manager");

            // Transaction automatically rolls back here
        });
    });
});
```

### Step 2: Conversion Checklist Per File

For each API test file:

- [ ] **Remove all imports:**
    - Remove `registerEndpoint` from `@nuxt/test-utils/runtime`
    - Remove `readBody` and `createError` from `h3` (no longer needed in tests)
    - Remove all `vi.mock()` calls (except external services like email)

- [ ] **Add required imports:**

    ```typescript
    import {
        withTestTransaction,
        createAndLoginUser,
        loginAs,
    } from "#test/utils";
    import { eq, and } from "drizzle-orm";
    import {
        families,
        familyMembers /* other tables */,
    } from "~/server/db/schema";
    ```

- [ ] **Wrap each test in `withTestTransaction()`:**

    ```typescript
    it("test name", async () => {
        await withTestTransaction(async (tx) => {
            // test code here
        });
    });
    ```

- [ ] **Replace authentication mocking:**

    ```typescript
    // OLD: event.context.user = { id: "user-123", ... }

    // NEW:
    const { user } = await createAndLoginUser(tx, {
        email: "test@example.com",
        username: "testuser",
    });
    ```

- [ ] **Replace `registerEndpoint()` with real `$fetch()` calls:**

    ```typescript
    // OLD: registerEndpoint("/api/families", { handler: ... })

    // NEW: Just make the request directly
    const response = await $fetch("/api/families", {
        method: "POST",
        body: { name: "Test Family" },
    });
    ```

- [ ] **Add database state verification:**
    - After API call, query the database using `tx.query.*` to verify the operation succeeded
    - Check related tables (e.g., if creating a family, verify family_members entry)

- [ ] **For 401/403 tests:**

    ```typescript
    // 401: Don't create user/session
    it("should return 401 for unauthenticated users", async () => {
        await withTestTransaction(async () => {
            await expect(
                $fetch("/api/families", {
                    method: "POST",
                    body: { name: "Test" },
                }),
            ).rejects.toMatchObject({ statusCode: 401 });
        });
    });

    // 403: Create user without proper role/permissions
    it("should return 403 for regular users", async () => {
        await withTestTransaction(async (tx) => {
            const { user } = await createAndLoginUser(tx); // Regular user

            await expect($fetch("/api/admin/users")).rejects.toMatchObject({
                statusCode: 403,
            });
        });
    });
    ```

- [ ] **Keep external service mocks:**

    ```typescript
    // Email sending should remain mocked
    const mockSendEmail = vi.fn();
    vi.mock("~/server/utils/email-sender", () => ({
        sendInvitationEmail: mockSendEmail,
    }));

    // Then verify it was called
    expect(mockSendEmail).toHaveBeenCalledOnce();
    ```

### Step 3: File-by-File Conversion Order

Convert in this order (easiest to hardest):

1. **`test/nuxt/api/families.spec.ts`** (5 tests)
    - Basic CRUD operations
    - Good starter template
    - Covers authentication, validation, and database verification

2. **`test/nuxt/api/families/transfer-ownership.spec.ts`** (5 tests)
    - Authorization logic (creator-only)
    - Tests 401, 403, 400 scenarios

3. **`test/nuxt/api/admin/roles.spec.ts`** (3 tests)
    - Simple GET endpoint
    - No complex relationships

4. **`test/nuxt/api/admin/users.spec.ts`** (7 tests)
    - RBAC testing (admin vs user)
    - User creation with roles
    - Good for testing authorization patterns

5. **`test/nuxt/api/auth/email-verification.spec.ts`** (7 tests)
    - Token-based validation
    - Email verification workflow

6. **`test/nuxt/api/families/invitations.spec.ts`** (4 tests)
    - Complex: authorization, validation, email sending (keep mock)
    - Multiple table interactions
    - Manager-only operations

### Step 4: Run Tests After Each Conversion

After converting each file:

```bash
# Run just that file
pnpm run test test/nuxt/api/families.spec.ts

# Run all tests to check for regressions
pnpm run test

# Verify all 125 tests still pass
```

### Step 5: Enable Parallel Test Execution

Once all conversions are complete:

1. **Verify transaction isolation:**
    - Run tests multiple times to ensure no flaky tests
    - Check that tests don't interfere with each other

2. **Configure Vitest for parallelization:**

    Update `vitest.config.ts`:

    ```typescript
    export default defineVitestConfig({
        test: {
            // ... existing config
            pool: "threads",
            poolOptions: {
                threads: {
                    singleThread: false,
                    minThreads: 1,
                    maxThreads: 4,
                },
            },
        },
    });
    ```

3. **Run parallel tests:**

    ```bash
    pnpm run test --reporter=verbose
    ```

4. **Measure performance improvement:**
    - Baseline: Current test suite time
    - Target: Faster execution with parallel tests

---

## Testing the Conversions

### Success Criteria

For each converted test file:

- ✅ All tests pass
- ✅ No `registerEndpoint()` calls remain
- ✅ No `vi.mock("#server/db")` calls (except external services)
- ✅ Every test uses `withTestTransaction()`
- ✅ Database state is verified after operations
- ✅ Tests are isolated (can run in any order)
- ✅ No database pollution between tests

### Validation Commands

```bash
# Check for remaining registerEndpoint usage
grep -r "registerEndpoint" test/nuxt/api --include="*.spec.ts"

# Check for database mocks
grep -r 'vi.mock.*#server/db' test/nuxt/api --include="*.spec.ts"

# Run all tests
pnpm run test

# Run with coverage
pnpm run test:coverage

# Run tests multiple times to check for flakiness
for i in {1..5}; do pnpm run test; done
```

---

## Common Patterns & Solutions

### Pattern 1: Creating Users with Specific Roles

```typescript
// For admin tests
await withTestTransaction(async (tx) => {
    // TODO: Add role support to createTestUser
    // Current workaround: manually insert role associations
    const { user } = await createAndLoginUser(tx);

    // Add admin role manually (temporary until fixture updated)
    // await tx.insert(userRoles).values({ user_id: user.id, role_id: adminRoleId });
});
```

**Note:** May need to extend `createTestUser()` to support role assignment.

### Pattern 2: Testing Authorization (403)

```typescript
it("should return 403 for non-managers", async () => {
    await withTestTransaction(async (tx) => {
        // Create family with owner
        const owner = await createTestUser(tx);
        const family = await createTestFamily(tx, owner.id);

        // Create regular member (not manager)
        const member = await createTestUser(tx);
        await tx.insert(familyMembers).values({
            family_id: family.id,
            user_id: member.id,
            role: "member",
        });

        // Login as regular member
        await loginAs(member.id);

        // Attempt manager-only operation
        await expect(
            $fetch(`/api/families/${family.id}/invitations`, {
                method: "POST",
                body: { email: "test@example.com" },
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});
```

### Pattern 3: Keeping External Service Mocks

```typescript
// At top of file
const mockSendEmail = vi.fn();
vi.mock("~/server/utils/email-sender", () => ({
    sendInvitationEmail: mockSendEmail,
}));

// In test
it("should send invitation email", async () => {
    await withTestTransaction(async (tx) => {
        const { user } = await createAndLoginUser(tx);
        const family = await createTestFamily(tx, user.id);

        mockSendEmail.mockClear(); // Reset before test

        await $fetch(`/api/families/${family.id}/invitations`, {
            method: "POST",
            body: { email: "invitee@example.com" },
        });

        // Verify mock was called
        expect(mockSendEmail).toHaveBeenCalledOnce();
        expect(mockSendEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "invitee@example.com",
            }),
        );
    });
});
```

---

## Expected Outcomes

After completing Phase 2:

- **Test Count:** Still ~125 tests (no tests removed, only converted)
- **Test Quality:** Significantly higher - tests now validate real behavior
- **Test Speed:** Potentially faster with parallel execution
- **Confidence:** Much higher - tests catch real bugs
- **Maintenance:** Easier - no mock setup/maintenance
- **TDD Ready:** Yes - can write tests before implementation

---

## Rollback Plan

If issues arise:

1. **Per-file rollback:**

    ```bash
    git checkout HEAD -- test/nuxt/api/families.spec.ts
    ```

2. **Full Phase 2 rollback:**

    ```bash
    git reset --hard <commit-before-phase-2>
    ```

3. **Keep infrastructure, revert tests:**
    - The Phase 1 infrastructure (test utils) is independent
    - Can revert test conversions while keeping utilities

---

## Notes

- **Database Performance:** Tests may be slower initially. Optimize if needed by:
    - Using database indexes
    - Minimizing fixture data
    - Running tests in parallel

- **Test-Only Endpoint Security:** The `/api/test/login` endpoint is protected by:

    ```typescript
    if (process.env.NODE_ENV !== "test") {
        throw createError({ statusCode: 404 });
    }
    ```

    This prevents exposure in production.

- **Existing Passing Tests:** The test suite currently has 125 passing tests. After Phase 2, this should remain stable or increase if additional edge cases are discovered during conversion.

---

## Questions & Clarifications

If you encounter:

1. **Missing real endpoints:** Some mocked endpoints might not have real implementations. Document these for later implementation.

2. **Complex authorization logic:** If authorization is too complex to test easily, consider refactoring into testable helper functions.

3. **External dependencies:** Identify all external services (email, payment, etc.) and ensure they remain mocked.

4. **Test failures:** If tests fail after conversion, it may indicate:
    - Real bugs in the API endpoints (good!)
    - Missing database constraints or validation
    - Incorrect test assumptions

---

## Success Metrics

Track these metrics throughout Phase 2:

| Metric                     | Before | After | Goal |
| -------------------------- | ------ | ----- | ---- |
| Tests using mocks          | 36     | 0     | 0    |
| Tests with DB validation   | 0      | 36    | 36   |
| `registerEndpoint()` calls | ~36    | 0     | 0    |
| `vi.mock(db)` calls        | 2      | 0     | 0    |
| Test isolation             | ❌     | ✅    | ✅   |
| Parallel execution         | ❌     | ✅    | ✅   |
| Confidence level           | Low    | High  | High |
