---
title: Test Suite Refactoring & Optimization Plan
date: 2025-11-13
tags:
    - testing
    - refactoring
    - tdd
    - database
    - api
    - security
---

## Test Suite Refactoring & Optimization Plan

I've completed a comprehensive analysis of your test suite. Here's what I found and my recommendations:

### Key Findings

**Current State:**

- 15 test files with 101 passing tests
- **Heavy use of mocks** for database and API endpoints
- No real authentication testing
- No database transaction rollback (tests pollute database)
- Missing security, edge case, and concurrency tests
- Not ready for Test-Driven Development (TDD)

### Critical Issues

1.  **Database Mocking Problem**: Tests mock the entire database layer, so they don't validate real database behavior, constraints, or errors
2.  **Fake API Endpoints**: Tests use `registerEndpoint()` to create simplified mock handlers instead of hitting real endpoints
3.  **No Transaction Isolation**: Tests write to database without cleanup, causing pollution
4.  **Security Gaps**: Authorization checks, input sanitization, and rate limiting untested

### Proposed Solution

**Core Approach:**

1.  **No database/API mocking** - Only mock external services (email, payment gateways)
2.  **Database transactions** - Every test runs in an isolated transaction that rolls back
3.  **Real endpoints** - Hit actual API routes with full validation
4.  **Real authentication** - Use test helper to create valid sessions via test-only login endpoint
5.  **Security-first** - Test authorization, injection attempts, rate limits

### Implementation Plan (5 Weeks)

#### Phase 1: Foundation (Week 1)

- [ ] **Database Transaction Wrapper with Auto-Rollback:**
    - Implement a utility function `withTestTransaction(callback)` that:
        - Starts a new database transaction before each test.
        - Passes the transaction object to the test callback.
        - Automatically rolls back the transaction after the test completes (regardless of pass/fail).
        - Ensures each test runs in a clean, isolated database state.
- [ ] **Fixture Factories for Test Data Creation:**
    - Develop factory functions (e.g., `createUser(data)`, `createFamily(data)`) to generate valid test data directly into the database within the current test transaction.
    - These factories should handle relationships and default values.
- [ ] **Authentication Helpers:**
    - Create helper functions like `loginAs(userId)` and `createTestUser(data)`:
        - `createTestUser(data)`: Creates a user in the database using the fixture factory.
        - `loginAs(userId)`: Simulates a user login, returning necessary authentication headers/cookies for API requests. This might involve a dedicated test-only login endpoint that bypasses full credential checks for speed.
- [ ] **Test Context Setup/Teardown:**
    - Configure Vitest `setupFiles` to initialize the test environment (e.g., database connection, global helpers).
    - Ensure proper teardown to clean up any non-transactional resources (if any).

#### Phase 2: Convert Tests (Week 2)

- [ ] **Refactor All API Test Files:**
    - Go through each of the existing 8 API test files.
    - Replace `registerEndpoint()` mocks with actual `$fetch` calls to the real API routes.
    - Integrate `withTestTransaction` for all database interactions.
    - Use authentication helpers to simulate logged-in users.
    - Verify both API response and the resulting database state (using the transaction object).
- [ ] **Remove `vi.mock()` Calls for Business Logic:**
    - Identify and remove all `vi.mock()` calls that are currently mocking database interactions, service logic, or API endpoints.
    - Only retain mocks for truly external, non-controlled services (e.g., email sending, third-party payment gateways).
- [ ] **Enable Parallel Test Execution:**
    - Ensure the new transaction-based setup allows for safe parallel execution of tests without data conflicts.
    - Configure Vitest for optimal parallelization.

#### Phase 3: Security & Edge Cases (Week 3)

- [ ] **Authorization Test Suite (401/403 Testing):**
    - Create dedicated tests to verify proper access control for all API endpoints.
    - Test scenarios for unauthenticated users (expecting 401 Unauthorized).
    - Test scenarios for authenticated users with insufficient permissions (expecting 403 Forbidden).
    - Test role-based access control (RBAC) for different user roles.
- [ ] **Input Validation (SQL Injection, XSS):**
    - Develop tests that attempt to inject malicious data into API endpoints (e.g., SQL injection payloads, XSS scripts).
    - Verify that the application correctly sanitizes inputs or rejects invalid requests.
- [ ] **Concurrency/Race Condition Tests:**
    - Identify critical sections of the application (e.g., creating unique resources, updating shared counters).
    - Write tests that simulate multiple concurrent requests to these sections to uncover race conditions.
- [ ] **Session Management Testing:**
    - Test session expiration, token invalidation, and secure cookie handling.
    - Verify that sessions cannot be easily hijacked or reused after logout.

#### Phase 4: TDD Infrastructure (Week 4)

- [ ] **TDD Workflow Documentation:**
    - Create clear documentation on how to practice TDD within the project, leveraging the new test setup.
    - Include guidelines for writing failing tests first, then implementing code, and finally refactoring.
- [ ] **Test Templates and Generators:**
    - Develop boilerplate test files or a simple generator to quickly scaffold new API and unit tests with the correct setup (transaction, auth helpers).
- [ ] **Fast Feedback Mechanisms:**
    - Ensure the test suite runs quickly enough to support a rapid TDD cycle.
    - Investigate and implement strategies for further test performance optimization if needed (e.g., selective test running, caching).
- [ ] **Performance Optimization:**
    - Review overall test suite performance and identify bottlenecks.
    - Optimize database queries within tests, if necessary.

#### Phase 5: Cleanup and Finalization (Week 5)

- [ ] **Remove Obsolete Code:**
    - Delete all old mock-based tests that have been replaced.
    - Remove any now-unused test helper files or utilities related to the old mocking strategy (e.g., `registerEndpoint` helpers if they are no longer needed).
- [ ] **Update Documentation:**
    - Review and update all `README.md` files and other developer documentation to reflect the new testing strategy.
    - Ensure instructions for running tests and creating new ones are accurate.
- [ ] **Final Review:**
    - Conduct a final review of the entire test suite to ensure consistency, clarity, and full coverage of critical paths.
    - Confirm that all tests are running reliably and providing meaningful feedback.

### Example of Converted Test

```typescript
// BEFORE: Mocked test
registerEndpoint("/api/families", {
    handler: (event) => {
        /* fake logic */
    },
});

// AFTER: Real test with transaction
import {
    withTestTransaction,
    createTestUser,
    loginAs,
    getAuthHeaders,
} from "#test/utils"; // Assuming these helpers are created

describe("POST /api/families", () => {
    it("should create a new family for an authenticated user", async () => {
        await withTestTransaction(async (tx) => {
            // 1. Setup: Create a test user and log them in
            const user = await createTestUser(tx, {
                username: "testuser",
                email: "test@example.com",
            });
            const { headers } = await loginAs(user.id); // Get auth headers for the user

            // 2. Action: Make the API request
            const familyName = "My Test Family";
            const response = await $fetch("/api/families", {
                method: "POST",
                headers: headers, // Use the auth headers
                body: { name: familyName },
            });

            // 3. Assertion: Verify the API response
            expect(response).toBeDefined();
            expect(response.name).toBe(familyName);
            expect(response.id).toBeDefined();

            // 4. Assertion: Verify the database state directly
            const createdFamily = await tx.query.families.findFirst({
                where: (families, { eq }) => eq(families.id, response.id),
            });
            expect(createdFamily).toBeDefined();
            expect(createdFamily?.name).toBe(familyName);

            // Verify the family membership was also created
            const familyMembership = await tx.query.familyMembers.findFirst({
                where: (members, { and, eq }) =>
                    and(
                        eq(members.familyId, createdFamily!.id),
                        eq(members.userId, user.id),
                    ),
            });
            expect(familyMembership).toBeDefined();
            expect(familyMembership?.role).toBe("manager"); // Assuming the creator is a manager

            // Transaction automatically rolls back here, cleaning up user, family, and membership
        });
    });

    it("should return 401 if unauthenticated", async () => {
        await withTestTransaction(async () => {
            await expect(
                $fetch("/api/families", {
                    method: "POST",
                    body: { name: "Unauthorized Family" },
                }),
            ).rejects.toMatchObject({
                statusCode: 401,
                statusMessage: "Unauthorized",
            });
        });
    });

    // Add more tests for validation, edge cases, etc.
});
```
