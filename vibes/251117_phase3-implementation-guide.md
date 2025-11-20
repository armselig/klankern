---
title: "Phase 3 Test Refactoring - Implementation Guide: Security & Edge Cases"
date: 2025-11-17
updated: 2025-11-20
status: in-progress
progress: "Part 2 Complete, Part 3 Partially Complete (Input Validation: createFamily & createUser), Part 4 Complete (Concurrency & Session Management), Part 5 Partially Complete (Edge Cases: ~30%)"
related_documents:
    - vibes/251117_phase2-completion-report.md
    - vibes/251114_service-layer-refactoring-plan.md
    - vibes/251113_test-refactoring-plan.md
    - vibes/251118_phase3-breakdown.md
    - vibes/251119_phase3-authorization-complete.md
    - vibes/251119_phase3-session-mgmt-complete.md
tags:
    - testing
    - security
    - refactoring
    - phase3
priority: high
---

# Phase 3: Security & Edge Cases Testing

> **🎉 PROGRESS UPDATE (2025-11-20):**
>
> - **Part 2: Authorization Testing is COMPLETE!** All authorization tests implemented and merged. 34 tests across 4 services passing. Shared authorization utilities created.
> - **Part 3: Input Validation - PARTIALLY COMPLETE!** PR #60 merged with 13 input validation tests for createFamily (2 tests) and createUser (11 tests). All 230 tests passing. Validation pattern established.
> - **Part 4: Concurrency Testing is COMPLETE!** PR #61 merged with 10 comprehensive concurrency tests. All 240 tests passing. Discovered critical race condition in transferOwnership function requiring future fix.
> - **Part 4: Session Management Testing is COMPLETE!** Issue #52 resolved with commit 7fca97fc. Added 7 session management tests (3 auth + 4 invitations, 1 todo). Total: 248 passing tests.
> - **Part 5: Edge Case Testing - PARTIALLY COMPLETE!** PR #63 merged with 14 edge case tests across all services. Created shared validation helper. ~30% edge case coverage achieved. Remaining categories deferred to follow-up issues.
>
> See [Phase 3 Authorization Completion Report](vibes/251119_phase3-authorization-complete.md) for Part 2 details.
> See [Phase 3 Session Management Completion Summary](vibes/251119_phase3-session-mgmt-complete.md) for Part 4 Session Management details.

## Executive Summary

With Phase 2 complete and the service layer pattern established, **Phase 3** focuses on ensuring the application is secure and handles edge cases correctly. This phase adds comprehensive security testing and validates that the system behaves correctly under unusual or adversarial conditions.

### Goals

1. **Authorization Testing**: Verify proper access control for all operations
2. **Input Validation**: Test SQL injection, XSS, and other injection attacks
3. **Concurrency Testing**: Ensure database constraints handle race conditions
4. **Session Management**: Validate authentication and session security
5. **Edge Case Coverage**: Test boundary conditions, null values, and unusual inputs

### Approach

- **Build on Phase 2**: Use the service layer pattern for comprehensive testing
- **Transaction Isolation**: All tests use `withTestTransaction()` for speed and safety
- **Real Database**: Test actual security mechanisms, not mocks
- **Domain Errors**: Verify proper error responses for security violations

---

## Table of Contents

1. [Testing Categories](#testing-categories)
2. [Authorization Testing](#authorization-testing)
3. [Input Validation Testing](#input-validation-testing)
4. [Concurrency Testing](#concurrency-testing)
5. [Session Management Testing](#session-management-testing)
6. [Edge Case Testing](#edge-case-testing)
7. [Implementation Plan](#implementation-plan)
8. [Testing Patterns](#testing-patterns)
9. [Success Criteria](#success-criteria)
10. [Timeline](#timeline)

---

## Testing Categories

### 1. Authorization Testing (401/403)

**Goal:** Ensure users can only access resources and perform actions they're authorized for.

**Scope:**

- Unauthenticated access (401 UnauthorizedError)
- Insufficient permissions (403 ForbiddenError)
- Resource ownership validation
- Role-based access control (RBAC)
- Cross-family access prevention

**Services to Test:**

- All family operations (create, read, update, delete)
- Invitation operations (create, accept, decline)
- Admin operations (user management, role management)
- Ownership transfers
- Member removal

### 2. Input Validation (400)

**Goal:** Prevent injection attacks and validate business rules.

**Scope:**

- SQL injection attempts
- XSS script injection
- Malformed data (invalid UUIDs, negative numbers)
- Empty/null values where not allowed
- String length limits
- Email format validation
- Username format validation

**Attack Vectors:**

- String fields: SQL injection, XSS
- Numeric fields: Integer overflow, negative values
- UUID fields: Invalid formats
- Email fields: Malformed addresses, injection attempts

### 3. Concurrency Testing

**Goal:** Verify database constraints prevent race conditions.

**Scope:**

- Duplicate creation prevention (unique constraints)
- Simultaneous operations on same resource
- Optimistic locking scenarios
- Transaction isolation levels
- Deadlock prevention

**Scenarios:**

- Multiple users creating families simultaneously
- Concurrent invitation acceptance
- Simultaneous ownership transfers
- Parallel member additions

### 4. Session Management Testing

**Goal:** Ensure authentication and session security.

**Scope:**

- Token generation and validation
- Token expiration
- Token invalidation
- Email verification flow
- Password reset security
- Secure cookie handling

**Attack Scenarios:**

- Expired token usage
- Invalid token formats
- Token reuse after invalidation
- Missing tokens

### 5. Edge Case Testing

**Goal:** Handle boundary conditions and unusual inputs gracefully.

**Scope:**

- Null/undefined values
- Empty strings
- Very long strings
- Special characters
- Non-existent resource IDs
- Deleted resources
- Soft-deleted resources

---

## Authorization Testing

> **✅ STATUS UPDATE (2025-11-19): PART 2 COMPLETE**
>
> Authorization testing (Part 2 of Phase 3) is now **COMPLETE** with all planned issues merged:
>
> - **✅ Issue #48 (PR #59):** Invitations service authorization tests implemented. Added 10 tests covering manager-only operations, authentication checks, and conflict prevention. Follow-up commit (b6da223f) added `UnauthorizedError` for unauthenticated users and improved test fixtures.
> - **✅ Issue #49:** Admin services (users & roles) authorization tests implemented. Added 12 tests (6 users + 6 roles) with admin-only authorization checks. Services now enforce authentication and admin role requirements.
> - **✅ Refactoring (6cb936c1):** Extracted `isAdmin()` helper to `server/lib/authorization.ts` to eliminate code duplication. Updated both services to use shared helper. Documented administrative authorization pattern in this guide.
> - **✅ Issue #57 (PR #57):** Families service authorization tests (12 tests) covering all categories.
>
> **Total Authorization Tests:** 34 tests across 4 services (families: 12, invitations: 10, users: 6, roles: 6)
>
> **Status:** All tests passing. Authorization pattern standardized across services. Ready to proceed with Part 3 (Input Validation Testing).

### Overview

Authorization testing verifies that access control is properly enforced at the service layer. Services should check authorization before performing sensitive operations.

### Key Principles

1. **Service-Level Enforcement**: Authorization must be checked in services, not just route handlers
2. **User Context**: Services accept `userId` parameter to identify who is requesting the operation
3. **Domain Errors**: Use `UnauthorizedError` (401) and `ForbiddenError` (403) appropriately
4. **Ownership Validation**: Verify resource ownership before allowing modifications

### Authorization Test Categories

#### Category 1: Unauthenticated Access (401)

Test operations that require authentication but receive no user context.

**Pattern:**

```typescript
it("should throw UnauthorizedError when user is not authenticated", async () => {
    await withTestTransaction(async (tx) => {
        // Setup
        const family = await createTestFamily(tx, someUserId);

        // Action & Assertion: Pass null/undefined userId
        await expect(
            someService.operation(tx, null as any, family.id),
        ).rejects.toThrow(UnauthorizedError);
    });
});
```

#### Category 2: Insufficient Permissions (403)

Test operations that require specific permissions or roles.

**Pattern:**

```typescript
it("should throw ForbiddenError when user lacks required permission", async () => {
    await withTestTransaction(async (tx) => {
        // Setup: Create resource owner
        const owner = await createTestUser(tx);
        const family = await createTestFamily(tx, owner.id);

        // Setup: Create unauthorized user
        const otherUser = await createTestUser(tx);

        // Action & Assertion: Unauthorized user trying to modify resource
        await expect(deleteFamily(tx, otherUser.id, family.id)).rejects.toThrow(
            ForbiddenError,
        );
    });
});
```

#### Category 3: Resource Ownership

Test that users can only modify resources they own.

**Example: Family Deletion**

```typescript
describe("deleteFamily - Authorization", () => {
    it("should allow creator to delete their own family", async () => {
        await withTestTransaction(async (tx) => {
            const creator = await createTestUser(tx);
            const family = await createTestFamily(tx, creator.id);

            // Creator should be able to delete
            const result = await deleteFamily(tx, creator.id, family.id);
            expect(result.success).toBe(true);

            // Verify deletion
            const deletedFamily = await tx.query.families.findFirst({
                where: eq(families.id, family.id),
            });
            expect(deletedFamily).toBeUndefined();
        });
    });

    it("should prevent non-creator from deleting family", async () => {
        await withTestTransaction(async (tx) => {
            const creator = await createTestUser(tx);
            const family = await createTestFamily(tx, creator.id);

            const otherUser = await createTestUser(tx);

            // Non-creator should be forbidden
            await expect(
                deleteFamily(tx, otherUser.id, family.id),
            ).rejects.toThrow(ForbiddenError);
        });
    });

    it("should prevent family member (non-creator) from deleting", async () => {
        await withTestTransaction(async (tx) => {
            const creator = await createTestUser(tx);
            const family = await createTestFamily(tx, creator.id);

            // Add a member (not creator)
            const member = await createTestUser(tx);
            await tx.insert(familyMembers).values({
                family_id: family.id,
                user_id: member.id,
                role: "member",
            });

            // Member should not be able to delete
            await expect(
                deleteFamily(tx, member.id, family.id),
            ).rejects.toThrow(ForbiddenError);
        });
    });
});
```

#### Category 4: Role-Based Access Control

Test operations that require specific roles (admin, manager, etc.).

**Example: Invitation Creation**

```typescript
describe("createInvitation - RBAC", () => {
    it("should allow family manager to create invitation", async () => {
        await withTestTransaction(async (tx) => {
            const creator = await createTestUser(tx);
            const family = await createTestFamily(tx, creator.id);

            // Creator is automatically a manager
            const invitation = await createInvitation(tx, creator.id, {
                familyId: family.id,
                email: "invited@example.com",
            });

            expect(invitation).toBeDefined();
            expect(invitation.email).toBe("invited@example.com");
        });
    });

    it("should prevent regular member from creating invitation", async () => {
        await withTestTransaction(async (tx) => {
            const creator = await createTestUser(tx);
            const family = await createTestFamily(tx, creator.id);

            // Add regular member (not manager)
            const member = await createTestUser(tx);
            await tx.insert(familyMembers).values({
                family_id: family.id,
                user_id: member.id,
                role: "member", // Not "manager"
            });

            // Member should be forbidden
            await expect(
                createInvitation(tx, member.id, {
                    familyId: family.id,
                    email: "invited@example.com",
                }),
            ).rejects.toThrow(ForbiddenError);
        });
    });

    it("should prevent non-member from creating invitation", async () => {
        await withTestTransaction(async (tx) => {
            const creator = await createTestUser(tx);
            const family = await createTestFamily(tx, creator.id);

            const outsider = await createTestUser(tx);

            // Non-member should be forbidden
            await expect(
                createInvitation(tx, outsider.id, {
                    familyId: family.id,
                    email: "invited@example.com",
                }),
            ).rejects.toThrow(ForbiddenError);
        });
    });
});
```

#### Category 5: Cross-Family Access Prevention

Ensure users cannot access resources from families they don't belong to.

**Example: Get Family Members**

```typescript
describe("getFamilyMembers - Cross-Family Access", () => {
    it("should allow family member to view members", async () => {
        await withTestTransaction(async (tx) => {
            const creator = await createTestUser(tx);
            const family = await createTestFamily(tx, creator.id);

            const members = await getFamilyMembers(tx, creator.id, family.id);
            expect(members).toBeDefined();
            expect(members.length).toBeGreaterThan(0);
        });
    });

    it("should prevent non-member from viewing family members", async () => {
        await withTestTransaction(async (tx) => {
            const creator = await createTestUser(tx);
            const family = await createTestFamily(tx, creator.id);

            const outsider = await createTestUser(tx);

            // Outsider should be forbidden
            await expect(
                getFamilyMembers(tx, outsider.id, family.id),
            ).rejects.toThrow(ForbiddenError);
        });
    });

    it("should prevent member of Family A from viewing Family B members", async () => {
        await withTestTransaction(async (tx) => {
            // Family A
            const userA = await createTestUser(tx);
            const familyA = await createTestFamily(tx, userA.id);

            // Family B
            const userB = await createTestUser(tx);
            const familyB = await createTestFamily(tx, userB.id);

            // userA trying to access familyB
            await expect(
                getFamilyMembers(tx, userA.id, familyB.id),
            ).rejects.toThrow(ForbiddenError);
        });
    });
});
```

### Administrative Authorization Pattern

For operations that should only be performed by administrators, a centralized `isAdmin` helper function has been created in `server/lib/authorization.ts`.

**`isAdmin` Helper:**

This function checks if a given `userId` has the `admin` role in the database.

```typescript
// server/lib/authorization.ts
import { and, eq } from "drizzle-orm";
import { userRoles } from "#server/db/schema";
import type { DbConnection } from "#server/lib/types";

export async function isAdmin(
    dbConnection: DbConnection,
    userId: string,
): Promise<boolean> {
    const userRole = await dbConnection.query.userRoles.findFirst({
        where: and(eq(userRoles.user_id, userId)),
        with: {
            role: true,
        },
    });

    return userRole?.role.name === "admin";
}
```

**Usage in Services:**

Service functions that require admin privileges should use this helper to perform authorization checks at the beginning of the function.

```typescript
// server/services/users.ts
import { isAdmin } from "#server/lib/authorization";
import { UnauthorizedError, ForbiddenError } from "#server/lib/errors";

export async function someAdminOnlyOperation(
    dbConnection: DbConnection,
    userId: string | null | undefined,
    // ... other params
) {
    if (!userId) {
        throw new UnauthorizedError("User not authenticated");
    }

    if (!(await isAdmin(dbConnection, userId))) {
        throw new ForbiddenError("User does not have admin privileges");
    }

    // ... rest of the function logic
}
```

This pattern ensures that all administrative operations are consistently protected.

#### Caching Admin Status (Consideration)

To avoid repeated database queries for the admin status within the same request, we could consider implementing a middleware that checks the user's role once and caches the result in the request context (e.g., `event.context.isAdmin = true`).

This would be a performance optimization for API endpoints that call multiple admin-only service functions. For now, the `isAdmin` helper is called in each service function as needed.

### Authorization Testing Checklist

For each service function that modifies data or accesses restricted data:

- [ ] Test unauthenticated access (null/undefined userId)
- [ ] Test unauthorized user (user exists but no permission)
- [ ] Test resource ownership (owner can modify, others cannot)
- [ ] Test role requirements (admin, manager, etc.)
- [ ] Test cross-resource access (Family A member accessing Family B)
- [ ] Verify proper error types (UnauthorizedError vs ForbiddenError)
- [ ] Verify database state is unchanged when authorization fails

---

## Input Validation Testing

### Overview

Input validation testing ensures the system safely handles malicious or malformed input. The database layer (Drizzle + PostgreSQL) provides natural protection against SQL injection, but we should explicitly test to verify this protection.

### Key Principles

1. **Defense in Depth**: Rely on parameterized queries but test explicitly
2. **Fail Safe**: Invalid input should throw ValidationError, not crash
3. **No Information Leakage**: Error messages should not reveal system internals
4. **Type Safety**: TypeScript + Drizzle should prevent most issues

### Input Validation Test Categories

#### Category 1: SQL Injection Attempts

Test that SQL injection payloads are safely handled.

**Pattern:**

```typescript
describe("SQL Injection Protection", () => {
    it("should safely handle SQL injection in family name", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            const sqlInjectionPayload = "'; DROP TABLE families; --";

            // Should create safely (or throw ValidationError if we add length checks)
            const family = await createFamily(tx, user.id, {
                name: sqlInjectionPayload,
            });

            // Verify it was stored as a literal string, not executed
            expect(family.name).toBe(sqlInjectionPayload);

            // Verify families table still exists and is queryable
            const families = await tx.query.families.findMany();
            expect(families).toBeDefined();
        });
    });

    it("should safely handle SQL injection in username", async () => {
        await withTestTransaction(async (tx) => {
            const payload = "admin' OR '1'='1";

            const user = await createUser(tx, {
                email: "test@example.com",
                username: payload,
                password: "password123",
            });

            // Should be stored as literal string
            expect(user.username).toBe(payload);

            // Should not bypass authentication
            const foundUser = await tx.query.users.findFirst({
                where: eq(users.username, "admin"),
            });
            expect(foundUser).not.toBe(user);
        });
    });

    it("should safely handle SQL injection in search queries", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);
            await createTestFamily(tx, user.id, { name: "Legitimate Family" });

            const payload = "' OR 1=1 --";

            // If you have a search function
            const results = await searchFamilies(tx, user.id, payload);

            // Should return no results (or only matching results)
            // Should NOT return all families
            expect(results.length).toBe(0);
        });
    });
});
```

#### Category 2: XSS Script Injection

Test that HTML/JavaScript in user input is stored safely.

**Pattern:**

```typescript
describe("XSS Protection", () => {
    it("should sanitize script tags in family name", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            const xssPayload = "<script>alert('XSS')</script>";

            const family = await createFamily(tx, user.id, {
                name: xssPayload,
            });

            // Should be sanitized (script tags removed)
            expect(family.name).not.toContain("<script>");
            expect(family.name).not.toContain("alert");

            // Verify database doesn't contain malicious code
            const dbFamily = await tx.query.families.findFirst({
                where: eq(families.id, family.id),
            });
            expect(dbFamily?.name).not.toContain("<script>");
        });
    });

    it("should sanitize HTML event handlers in display name", async () => {
        await withTestTransaction(async (tx) => {
            const payload = "<img src=x onerror=alert('XSS')>";

            const user = await createUser(tx, {
                email: "test@example.com",
                username: "testuser",
                password: "password123",
                display_name: payload,
            });

            // Event handlers should be stripped
            expect(user.display_name).not.toContain("onerror");
            expect(user.display_name).not.toContain("alert");
        });
    });

    it("should sanitize inline event handlers", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            const payload = "<div onload='alert(1)'>Test</div>";

            const family = await createFamily(tx, user.id, {
                name: payload,
            });

            // Inline event handlers should be removed
            expect(family.name).not.toContain("onload");
            expect(family.name).not.toContain("alert");
        });
    });

    it("should allow safe HTML but sanitize dangerous elements", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            // Mix of safe and unsafe content
            const payload = "<b>Bold</b> <script>alert('bad')</script>";

            const family = await createFamily(tx, user.id, {
                name: payload,
            });

            // Safe tags might be allowed, dangerous ones removed
            expect(family.name).not.toContain("<script>");
            expect(family.name).not.toContain("alert('bad')");
        });
    });
});
```

**Note on XSS Sanitization Strategy:**

This application sanitizes XSS payloads **on write** (backend) to prevent malicious scripts from ever being stored in the database. This provides defense-in-depth protection.

**Implementation:**

- Services should sanitize user-provided strings before database insertion
- Use a library like `DOMPurify` (server-side) or similar to strip dangerous HTML/JS
- Frontend should still escape output as additional protection (defense-in-depth)

**Testing Approach:**

- Tests should verify that XSS payloads are sanitized before storage
- Example: `<script>alert('XSS')</script>` should be stored as empty string or plain text
- Services should document which fields are sanitized vs raw storage

#### Category 3: Invalid Data Formats

Test handling of malformed input.

**Pattern:**

```typescript
describe("Invalid Data Format Handling", () => {
    it("should reject invalid UUID format", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            const invalidUuid = "not-a-uuid";

            // Should throw ValidationError or NotFoundError
            await expect(getFamily(tx, user.id, invalidUuid)).rejects.toThrow();
        });
    });

    it("should handle empty string as family ID", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            await expect(getFamily(tx, user.id, "")).rejects.toThrow(
                ValidationError,
            );
        });
    });

    it("should reject malformed email addresses", async () => {
        await withTestTransaction(async (tx) => {
            const invalidEmails = [
                "notanemail",
                "@example.com",
                "user@",
                "user@.com",
                "user..name@example.com",
            ];

            for (const email of invalidEmails) {
                await expect(
                    createUser(tx, {
                        email,
                        username: "testuser",
                        password: "password123",
                    }),
                ).rejects.toThrow(ValidationError);
            }
        });
    });

    it("should handle extremely long strings", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            // Create a very long name (e.g., 10,000 characters)
            const veryLongName = "a".repeat(10000);

            // Depending on your schema constraints, this should either:
            // 1. Throw ValidationError (if you have length limits)
            // 2. Succeed but truncate (if database has length limits)
            // 3. Succeed (if no length limits - which is fine)

            await expect(
                createFamily(tx, user.id, { name: veryLongName }),
            ).rejects.toThrow(ValidationError); // Or succeed, depending on your rules
        });
    });
});
```

#### Category 4: Boundary Value Testing

Test edge values for numeric and string fields.

**Pattern:**

```typescript
describe("Boundary Value Testing", () => {
    it("should handle empty string family name", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            // Should throw ValidationError if empty not allowed
            await expect(
                createFamily(tx, user.id, { name: "" }),
            ).rejects.toThrow(ValidationError);
        });
    });

    it("should handle whitespace-only family name", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            await expect(
                createFamily(tx, user.id, { name: "   " }),
            ).rejects.toThrow(ValidationError);
        });
    });

    it("should handle special characters in names", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            const specialChars = "Family™ with émojis 😀 and symbols ©®";

            const family = await createFamily(tx, user.id, {
                name: specialChars,
            });

            expect(family.name).toBe(specialChars);
        });
    });

    it("should handle null values where not allowed", async () => {
        await withTestTransaction(async (tx) => {
            // TypeScript should prevent this, but test runtime behavior
            await expect(
                createFamily(tx, "user-id", { name: null as any }),
            ).rejects.toThrow();
        });
    });
});
```

### Input Validation Testing Checklist

For each service function:

- [ ] Test SQL injection payloads in string fields
- [ ] Test XSS script injection in user-visible fields
- [ ] Test invalid UUID formats
- [ ] Test empty strings
- [ ] Test whitespace-only strings
- [ ] Test extremely long strings (if length limits exist)
- [ ] Test special characters and Unicode
- [ ] Test null/undefined values
- [ ] Verify proper ValidationError responses

---

## Concurrency Testing

### Overview

Concurrency testing verifies that database constraints prevent race conditions when multiple operations happen simultaneously. PostgreSQL's transaction isolation and unique constraints provide protection, but we should test explicitly.

### Key Principles

1. **Database Constraints**: Rely on unique constraints, foreign keys, and transactions
2. **Last Write Wins**: Understand PostgreSQL's default behavior
3. **Atomic Operations**: Use database-level atomicity for critical operations
4. **Idempotency**: Design operations to be safely retryable

### Concurrency Test Categories

#### Category 1: Unique Constraint Enforcement

Test that duplicate entries are prevented.

**Pattern:**

```typescript
describe("Unique Constraint Enforcement", () => {
    it("should prevent duplicate email registration", async () => {
        await withTestTransaction(async (tx) => {
            // Create first user
            await createUser(tx, {
                email: "duplicate@example.com",
                username: "user1",
                password: "password123",
            });

            // Attempt to create second user with same email
            await expect(
                createUser(tx, {
                    email: "duplicate@example.com",
                    username: "user2",
                    password: "password123",
                }),
            ).rejects.toThrow(ConflictError);
        });
    });

    it("should prevent duplicate username registration", async () => {
        await withTestTransaction(async (tx) => {
            await createUser(tx, {
                email: "user1@example.com",
                username: "duplicate",
                password: "password123",
            });

            await expect(
                createUser(tx, {
                    email: "user2@example.com",
                    username: "duplicate",
                    password: "password123",
                }),
            ).rejects.toThrow(ConflictError);
        });
    });

    it("should prevent duplicate family membership", async () => {
        await withTestTransaction(async (tx) => {
            const creator = await createTestUser(tx);
            const family = await createTestFamily(tx, creator.id);
            const member = await createTestUser(tx);

            // Add member first time
            await tx.insert(familyMembers).values({
                family_id: family.id,
                user_id: member.id,
                role: "member",
            });

            // Attempt to add same member again
            await expect(
                tx.insert(familyMembers).values({
                    family_id: family.id,
                    user_id: member.id,
                    role: "member",
                }),
            ).rejects.toThrow();
        });
    });
});
```

#### Category 2: Simultaneous Operations

Test behavior when multiple operations happen in parallel.

**Pattern:**

```typescript
describe("Simultaneous Operations", () => {
    it("should handle concurrent family creation by same user", async () => {
        // Note: This test demonstrates the concept
        // In practice, our transaction isolation prevents true parallelism
        // But the pattern is valuable for understanding behavior

        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            // Attempt to create multiple families simultaneously
            const operations = [
                createFamily(tx, user.id, { name: "Family 1" }),
                createFamily(tx, user.id, { name: "Family 2" }),
                createFamily(tx, user.id, { name: "Family 3" }),
            ];

            const results = await Promise.all(operations);

            // All should succeed (no unique constraint on family name per user)
            expect(results).toHaveLength(3);
            expect(results.every((f) => f.creator_id === user.id)).toBe(true);
        });
    });

    it("should prevent concurrent invitation acceptance", async () => {
        await withTestTransaction(async (tx) => {
            const creator = await createTestUser(tx);
            const family = await createTestFamily(tx, creator.id);
            const invitedUser = await createTestUser(tx);

            const invitation = await createInvitation(tx, creator.id, {
                familyId: family.id,
                email: invitedUser.email,
            });

            // Attempt to accept twice (simulating race condition)
            const acceptance1 = acceptInvitation(
                tx,
                invitedUser.id,
                invitation.token,
            );

            // Second acceptance should fail (invitation already used)
            await acceptance1;

            await expect(
                acceptInvitation(tx, invitedUser.id, invitation.token),
            ).rejects.toThrow(ValidationError);
        });
    });
});
```

#### Category 3: Transaction Isolation

Test that operations within transactions are properly isolated.

**Pattern:**

```typescript
describe("Transaction Isolation", () => {
    it("should isolate family creation within transaction", async () => {
        // This demonstrates transaction behavior
        // Two separate transactions shouldn't see each other's uncommitted data

        const userId = await withTestTransaction(async (tx1) => {
            const user = await createTestUser(tx1);
            return user.id;
        });

        // Transaction 1: Create a family (but will rollback)
        const tx1Promise = withTestTransaction(async (tx1) => {
            const family = await createTestFamily(tx1, userId);

            // Simulate delay
            await new Promise((resolve) => setTimeout(resolve, 100));

            return family.id;
        });

        // Transaction 2: Try to see the family (should not exist yet)
        const tx2Promise = withTestTransaction(async (tx2) => {
            const families = await tx2.query.families.findMany({
                where: eq(families.creator_id, userId),
            });

            // Should not see tx1's family yet (transaction isolation)
            return families.length;
        });

        const [familyId, familyCount] = await Promise.all([
            tx1Promise,
            tx2Promise,
        ]);

        // Both transactions rolled back, but demonstrates isolation
        expect(familyId).toBeDefined();
        expect(familyCount).toBe(0); // Didn't see other transaction
    });
});
```

### Concurrency Testing Checklist

- [x] Test unique constraint enforcement (emails, usernames) ✅ PR #61
- [x] Test duplicate prevention (family members, invitations) ✅ PR #61
- [x] Test simultaneous operations on same resource ✅ PR #61
- [x] Test invitation acceptance race conditions ✅ PR #61
- [x] Test ownership transfer race conditions ✅ PR #61
- [x] Verify proper ConflictError/ValidationError/ForbiddenError responses ✅ PR #61
- [x] Test transaction isolation behavior ✅ PR #61

**✅ COMPLETED (2025-11-19) - PR #61**

- Implemented `acceptInvitation` function with full validation
- Created 10 comprehensive concurrency tests in `test/nuxt/services/concurrency.spec.ts`
- All tests passing (240 total in suite)
- Test execution: 386ms
- **⚠️ IMPORTANT DISCOVERY:** Identified race condition in `transferOwnership` - lacks database constraint, allowing concurrent transfers to both succeed (last write wins). Requires future fix with optimistic locking or database constraint.

---

## Session Management Testing

### Overview

Session management testing ensures that authentication, token generation, and verification are secure and properly enforced.

### Key Principles

1. **Token Security**: Tokens should be unpredictable and tamper-proof
2. **Expiration**: Tokens must expire after a reasonable time
3. **Invalidation**: Used or revoked tokens must not be reusable
4. **Verification**: Email verification flow must be secure

### Session Management Test Categories

#### Category 1: Email Verification Flow

Test the complete email verification process.

**Pattern:**

```typescript
describe("Email Verification Flow", () => {
    it("should successfully verify email with valid token", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx, {
                email: "unverified@example.com",
                username: "unverified",
            });

            // Generate verification token
            const token = await sendVerificationEmail(tx, user.id);

            // Verify email with token
            const result = await verifyEmail(tx, token);

            expect(result.success).toBe(true);

            // Verify database state
            const verifiedUser = await tx.query.users.findFirst({
                where: eq(users.id, user.id),
            });
            expect(verifiedUser?.email_verified).toBe(true);
        });
    });

    it("should reject invalid verification token", async () => {
        await withTestTransaction(async (tx) => {
            const invalidToken = "invalid-token-12345";

            await expect(verifyEmail(tx, invalidToken)).rejects.toThrow(
                ValidationError,
            );
        });
    });

    it("should reject expired verification token", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            // Create an expired token (if you have expiration logic)
            const expiredToken = await createExpiredVerificationToken(
                tx,
                user.id,
            );

            await expect(verifyEmail(tx, expiredToken)).rejects.toThrow(
                ValidationError,
            );
        });
    });

    it("should prevent token reuse", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);
            const token = await sendVerificationEmail(tx, user.id);

            // First verification succeeds
            await verifyEmail(tx, token);

            // Second verification with same token should fail
            await expect(verifyEmail(tx, token)).rejects.toThrow(
                ValidationError,
            );
        });
    });
});
```

#### Category 2: Invitation Token Security

Test invitation token generation and validation.

**Pattern:**

```typescript
describe("Invitation Token Security", () => {
    it("should generate unique tokens for each invitation", async () => {
        await withTestTransaction(async (tx) => {
            const creator = await createTestUser(tx);
            const family = await createTestFamily(tx, creator.id);

            const invitation1 = await createInvitation(tx, creator.id, {
                familyId: family.id,
                email: "user1@example.com",
            });

            const invitation2 = await createInvitation(tx, creator.id, {
                familyId: family.id,
                email: "user2@example.com",
            });

            // Tokens should be unique
            expect(invitation1.token).not.toBe(invitation2.token);
        });
    });

    it("should reject invitation with invalid token", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            await expect(
                acceptInvitation(tx, user.id, "invalid-token"),
            ).rejects.toThrow(ValidationError);
        });
    });

    it("should prevent accepting expired invitation", async () => {
        await withTestTransaction(async (tx) => {
            const creator = await createTestUser(tx);
            const family = await createTestFamily(tx, creator.id);
            const invitedUser = await createTestUser(tx);

            // Create invitation with past expiration
            const invitation = await createExpiredInvitation(
                tx,
                creator.id,
                family.id,
            );

            await expect(
                acceptInvitation(tx, invitedUser.id, invitation.token),
            ).rejects.toThrow(ValidationError);
        });
    });

    it("should invalidate invitation after acceptance", async () => {
        await withTestTransaction(async (tx) => {
            const creator = await createTestUser(tx);
            const family = await createTestFamily(tx, creator.id);
            const invitedUser = await createTestUser(tx);

            const invitation = await createInvitation(tx, creator.id, {
                familyId: family.id,
                email: invitedUser.email,
            });

            // Accept invitation
            await acceptInvitation(tx, invitedUser.id, invitation.token);

            // Try to accept again (should fail)
            await expect(
                acceptInvitation(tx, invitedUser.id, invitation.token),
            ).rejects.toThrow(ValidationError);
        });
    });
});
```

### Session Management Testing Checklist

- [x] Test email verification token generation _(Issue #52 - commit 7fca97fc)_
- [x] Test token validation (valid, invalid, expired) _(Issue #52 - commit 7fca97fc)_
- [x] Test token reuse prevention _(Issue #52 - commit 7fca97fc)_
- [x] Test invitation token uniqueness _(Issue #52 - commit 7fca97fc)_
- [x] Test invitation expiration _(Issue #52 - commit 7fca97fc)_
- [x] Test invitation invalidation after use _(Issue #52 - commit 7fca97fc)_
- [x] Test token tampering detection _(Issue #52 - commit 7fca97fc)_
- [x] Verify proper ValidationError responses _(Issue #52 - commit 7fca97fc)_

**Status:** COMPLETE (2025-11-19)
**Tests Added:** 7 tests (3 email verification + 4 invitation token security)
**Total Test Count:** 248 passing (1 todo)
**Note:** Email verification token expiration test marked as todo - `sendVerificationEmail` doesn't currently set expiration dates

---

## Edge Case Testing

> **✅ STATUS UPDATE (2025-11-20): PART 5 PARTIALLY COMPLETE**
>
> Edge case testing (Part 5 of Phase 3) has begun with **Issue #53** and **PR #63** merged:
>
> - **✅ PR #63 (Issue #53):** Edge case tests for all services implemented. Added 14 tests covering non-existent resources, soft-deleted managers, Unicode support, and operations on used/expired invitations.
> - **✅ New Infrastructure:** Created `server/lib/validation.ts` with shared `findResourceOrThrow` helper for consistent error handling across services.
> - **✅ Security Fixes:** Fixed UUID error handling (ValidationError vs NotFoundError), username validation regex security issue (\\p{S} → \\p{Emoji}).
> - **✅ Code Quality:** Reduced ~30 lines of duplicated error handling code. Services now use consistent validation pattern.
>
> **Overall Edge Case Coverage: ~30%**
>
> | Category               | Coverage | Status         |
> | ---------------------- | -------- | -------------- |
> | Non-Existent Resources | 60%      | 🟡 Partial     |
> | Soft-Deleted Resources | 20%      | 🟡 Partial     |
> | Unicode/Special Chars  | 70%      | ✅ Good        |
> | Empty Collections      | 10%      | 🟡 Limited     |
> | Deleted Resources      | 0%       | ❌ Not Started |
> | Min/Max Values         | 0%       | ❌ Not Started |
> | Null Handling          | 0%       | ❌ Not Started |
> | Boundary Conditions    | 0%       | ❌ Not Started |
>
> **Status:** Part 5 foundation complete. Remaining categories deferred to follow-up issues.

### Overview

Edge case testing ensures the system handles unusual inputs and boundary conditions gracefully.

### Edge Case Test Categories

#### Category 1: Non-Existent Resources

Test operations on resources that don't exist.

**Pattern:**

```typescript
describe("Non-Existent Resource Handling", () => {
    it("should throw NotFoundError for non-existent family", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            // Valid UUID format but doesn't exist
            const nonExistentId = "00000000-0000-0000-0000-000000000000";

            await expect(getFamily(tx, user.id, nonExistentId)).rejects.toThrow(
                NotFoundError,
            );
        });
    });

    it("should handle operations on deleted family", async () => {
        await withTestTransaction(async (tx) => {
            const creator = await createTestUser(tx);
            const family = await createTestFamily(tx, creator.id);

            // Delete family
            await deleteFamily(tx, creator.id, family.id);

            // Attempt to get deleted family
            await expect(getFamily(tx, creator.id, family.id)).rejects.toThrow(
                NotFoundError,
            );
        });
    });
});
```

#### Category 2: Soft-Deleted Resources

Test that soft-deleted resources are properly hidden.

**Pattern:**

```typescript
describe("Soft Delete Handling", () => {
    it("should hide soft-deleted users from queries", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            // Soft delete user
            await softDeleteUser(tx, user.id);

            // Query should not return soft-deleted user
            const foundUser = await tx.query.users.findFirst({
                where: eq(users.id, user.id),
            });

            expect(foundUser).toBeUndefined();
        });
    });

    it("should prevent actions on soft-deleted user", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);
            await softDeleteUser(tx, user.id);

            // Attempt to create family with soft-deleted user
            await expect(
                createFamily(tx, user.id, { name: "Test" }),
            ).rejects.toThrow(UnauthorizedError);
        });
    });
});
```

#### Category 3: Empty Collections

Test operations on empty or minimal data.

**Pattern:**

```typescript
describe("Empty Collection Handling", () => {
    it("should return empty array when user has no families", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            const families = await getUserFamilies(tx, user.id);

            expect(families).toBeDefined();
            expect(Array.isArray(families)).toBe(true);
            expect(families.length).toBe(0);
        });
    });

    it("should handle family with no members (only creator)", async () => {
        await withTestTransaction(async (tx) => {
            const creator = await createTestUser(tx);
            const family = await createTestFamily(tx, creator.id);

            const members = await getFamilyMembers(tx, creator.id, family.id);

            expect(members).toBeDefined();
            expect(members.length).toBe(1); // Just creator
            expect(members[0].user_id).toBe(creator.id);
        });
    });
});
```

#### Category 4: Special Characters and Unicode

Test handling of international characters and symbols.

**Pattern:**

```typescript
describe("Special Character Handling", () => {
    it("should support Unicode characters in family names", async () => {
        await withTestTransaction(async (tx) => {
            const user = await createTestUser(tx);

            const unicodeNames = [
                "Familie Müller",
                "Семья Иванов",
                "家族 田中",
                "משפחת כהן",
                "العائلة أحمد",
                "família 日本語 🏠",
            ];

            for (const name of unicodeNames) {
                const family = await createFamily(tx, user.id, { name });
                expect(family.name).toBe(name);

                // Verify database storage
                const dbFamily = await tx.query.families.findFirst({
                    where: eq(families.id, family.id),
                });
                expect(dbFamily?.name).toBe(name);
            }
        });
    });

    it("should support international email addresses", async () => {
        await withTestTransaction(async (tx) => {
            // Modern email standards support Unicode
            const email = "пользователь@пример.рф";

            const user = await createUser(tx, {
                email,
                username: "testuser",
                password: "password123",
            });

            expect(user.email).toBe(email);
        });
    });
});
```

### Shared Validation Helper

> **✅ IMPLEMENTED (PR #63):** A reusable validation helper is now available in `server/lib/validation.ts`.

**File:** `server/lib/validation.ts`

```typescript
export async function findResourceOrThrow<T>(
    findFn: () => Promise<T | undefined>,
    resourceName: string,
): Promise<T> {
    let resource;
    try {
        resource = await findFn();
    } catch (error: any) {
        // Postgres error code for invalid text representation (e.g. invalid UUID)
        if (error.cause?.code === "22P02") {
            throw new ValidationError(`Invalid ${resourceName} ID format`);
        }
        throw error;
    }

    if (!resource) {
        throw new NotFoundError(`${resourceName} not found`);
    }

    return resource;
}
```

**Usage Example:**

```typescript
// In service functions
const family = await findResourceOrThrow(
    () =>
        dbConnection.query.families.findFirst({
            where: eq(families.id, familyId),
        }),
    "Family",
);
```

**Benefits:**

- ✅ Consistent error handling across all services
- ✅ Correct error types: `ValidationError` (400) for invalid UUID format, `NotFoundError` (404) for missing resources
- ✅ Reduces code duplication (~30 lines removed from PR #63)
- ✅ Single source of truth for resource lookup logic

**Currently Used In:**

- `server/services/families.ts` - `transferOwnership` (family and user lookups)
- `server/services/invitations.ts` - `createInvitation` (family lookup)

### Edge Case Testing Checklist

- [x] Test non-existent resource IDs (60% complete) ✅ PR #63
- [ ] Test deleted resources (0% complete)
- [x] Test soft-deleted resources (20% complete) ✅ PR #63 - soft-deleted managers
- [ ] Test empty collections (10% complete - limited by missing getter functions)
- [x] Test Unicode and special characters (70% complete) ✅ PR #63
- [ ] Test minimum/maximum values (0% complete)
- [ ] Test null handling (0% complete)
- [ ] Test boundary conditions (0% complete)

**Checklist Completion: 3/8 items (37.5%)**

---

## Implementation Plan

### Recommended Approach

Implement Phase 3 tests **incrementally**, one category at a time, across all services.

### Step-by-Step Process

#### ✅ Step 1: Authorization Tests (Week 1) - COMPLETE

**Status:** Completed 2025-11-19

Focus: Add authorization tests to all existing services.

**Services Covered:**

- ✅ `server/services/families.ts` - Issue #57, PR #57 (12 tests)
- ✅ `server/services/invitations.ts` - Issue #48, PR #59 (10 tests)
- ✅ `server/services/users.ts` - Issue #49 (6 tests)
- ✅ `server/services/roles.ts` - Issue #49 (6 tests)

**For Each Service:**

1. ✅ Identify operations that require authorization
2. ✅ Write tests for unauthenticated access (401)
3. ✅ Write tests for insufficient permissions (403)
4. ✅ Write tests for resource ownership
5. ✅ Write tests for role-based access
6. ✅ Write tests for cross-family access prevention

**Deliverables:**

- ✅ Comprehensive authorization test coverage (34 tests total)
- ✅ All tests passing
- ✅ Documentation of authorization requirements
- ✅ Shared authorization utilities (`server/lib/authorization.ts`)
- ✅ Standardized authorization pattern across services

#### ⏳ Step 2: Input Validation Tests (Week 2) - PARTIALLY COMPLETE

**Status:** Partially completed 2025-11-19 (Issue #50, PR #60)

Focus: Add input validation tests to all services.

**Services Covered:**

- ✅ `server/services/families.ts` - Issue #50, PR #60 (2 tests)
- ✅ `server/services/users.ts` - Issue #50, PR #60 (11 tests)

**For Each Service:**

1. ✅ Identify string input fields
2. ⏳ Test SQL injection payloads (deferred)
3. ⏳ Test XSS payloads (deferred - sanitize on write strategy planned)
4. ✅ Test invalid formats (UUIDs, emails)
5. ✅ Test boundary values (empty, long, special chars)
6. ✅ Test null/undefined handling

**Deliverables:**

- ✅ Input validation test coverage for createFamily and createUser (13 tests total)
- ✅ All tests passing (230 total)
- ✅ Validation issues fixed (critical password validation bug resolved via code review)
- ✅ Input validation pattern established: early validation, clear error messages, security-focused
- ⏳ Remaining work: XSS sanitization, additional services (invitations, auth, roles)

#### Step 3: Concurrency Tests (Week 3)

Focus: Test database constraint enforcement.

**Areas to Cover:**

1. User registration (duplicate emails, usernames)
2. Family creation (concurrent operations)
3. Invitation acceptance (race conditions)
4. Membership management (duplicate prevention)
5. Ownership transfers (concurrent transfers)

**Deliverables:**

- Concurrency test coverage
- Verified constraint enforcement
- All tests passing

#### Step 4: Session Management Tests (Week 3-4)

Focus: Authentication and token security.

**Areas to Cover:**

1. Email verification flow
2. Invitation token generation and validation
3. Token expiration handling
4. Token reuse prevention
5. Password reset flow (if implemented)

**Deliverables:**

- Session management test coverage
- Token security verified
- All tests passing

#### Step 5: Edge Case Tests (Week 4)

Focus: Boundary conditions and unusual inputs.

**Areas to Cover:**

1. Non-existent resources
2. Deleted resources
3. Soft-deleted resources
4. Empty collections
5. Unicode and special characters
6. Minimum/maximum values

**Deliverables:**

- Edge case test coverage
- Graceful error handling verified
- All tests passing

---

## Testing Patterns

### Pattern 1: Authorization Test Structure

```typescript
describe("ServiceFunction - Authorization", () => {
    describe("Unauthenticated Access (401)", () => {
        it("should throw UnauthorizedError when userId is null", async () => {
            // Test pattern
        });
    });

    describe("Insufficient Permissions (403)", () => {
        it("should throw ForbiddenError when user lacks permission", async () => {
            // Test pattern
        });
    });

    describe("Resource Ownership", () => {
        it("should allow owner to perform operation", async () => {
            // Test pattern
        });

        it("should prevent non-owner from performing operation", async () => {
            // Test pattern
        });
    });

    describe("Role-Based Access", () => {
        it("should allow users with required role", async () => {
            // Test pattern
        });

        it("should prevent users without required role", async () => {
            // Test pattern
        });
    });
});
```

### Pattern 2: Input Validation Test Structure

```typescript
describe("ServiceFunction - Input Validation", () => {
    describe("SQL Injection Protection", () => {
        it("should safely handle SQL injection payloads", async () => {
            // Test pattern
        });
    });

    describe("XSS Protection", () => {
        it("should safely store script tags", async () => {
            // Test pattern
        });
    });

    describe("Format Validation", () => {
        it("should reject invalid formats", async () => {
            // Test pattern
        });
    });

    describe("Boundary Values", () => {
        it("should handle edge values correctly", async () => {
            // Test pattern
        });
    });
});
```

### Pattern 3: Concurrency Test Structure

```typescript
describe("ServiceFunction - Concurrency", () => {
    describe("Unique Constraint Enforcement", () => {
        it("should prevent duplicate entries", async () => {
            // Test pattern
        });
    });

    describe("Simultaneous Operations", () => {
        it("should handle concurrent operations safely", async () => {
            // Test pattern
        });
    });
});
```

### Pattern 4: Test Organization

**File Naming:**

- Keep existing test files (e.g., `test/nuxt/api/admin/users.spec.ts`)
- Add new test suites within existing files
- Group by service, then by test category

**Test Suite Structure:**

```
describe("Service Name", () => {
    describe("functionName", () => {
        // Happy path tests (from Phase 2)

        describe("Authorization", () => {
            // Authorization tests
        });

        describe("Input Validation", () => {
            // Validation tests
        });

        describe("Concurrency", () => {
            // Concurrency tests
        });

        describe("Edge Cases", () => {
            // Edge case tests
        });
    });
});
```

---

## Success Criteria

### Quantitative Metrics

| Metric                      | Target   | Measurement                                                                                                                                                                               |
| --------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authorization test coverage | Complete | All service functions that modify data or access restricted resources have authorization tests covering: unauthenticated access, insufficient permissions, ownership validation, and RBAC |
| Input validation tests      | Complete | All service functions accepting user input have validation tests for: SQL injection, XSS, invalid formats, and boundary values                                                            |
| Concurrency tests           | Complete | All unique constraints (email, username, membership) have tests preventing duplicates and race conditions                                                                                 |
| Session management tests    | Complete | All token operations (generation, validation, expiration, invalidation) are tested                                                                                                        |
| Edge case coverage          | Complete | All services handle: non-existent IDs, deleted resources, empty collections, and special characters                                                                                       |
| Test execution time         | <15s     | All tests complete quickly with transaction isolation                                                                                                                                     |
| Tests passing               | 100%     | Zero failures                                                                                                                                                                             |
| Security issues found       | 0        | No critical vulnerabilities                                                                                                                                                               |

### Qualitative Goals

- **Confidence**: High confidence in security and error handling
- **Documentation**: Clear examples of security testing patterns
- **Maintainability**: Tests are easy to understand and update
- **Reusability**: Patterns can be applied to new services

### Phase 3 Completion Criteria

- [x] **Authorization tests for all services** ✅ COMPLETE (2025-11-19)
    - 34 tests across 4 services (families, invitations, users, roles)
    - Shared authorization utilities created
    - All authorization patterns documented
- [~] **Input validation tests for all user inputs** ⏳ PARTIALLY COMPLETE (2025-11-19)
    - 13 tests for createFamily and createUser (Issue #50, PR #60)
    - Validation pattern established
    - Remaining: XSS sanitization, additional services
- [ ] Concurrency tests for all unique constraints
- [ ] Session management tests for all token operations
- [ ] Edge case tests for all boundary conditions
- [x] **All tests passing** ✅ (230 total tests including 13 new input validation tests)
- [x] **No security vulnerabilities discovered** ✅
- [x] **Test execution time < 15 seconds** ✅
- [x] **Documentation updated** ✅
- [x] **Completion report written** ✅ ([Phase 3 Authorization Completion Report](vibes/251119_phase3-authorization-complete.md))

**Progress: 2.5 of 5 parts complete (50%)**

---

## Timeline

### Flexible Schedule (4 weeks, adaptable)

**✅ Week 1: Authorization Testing - COMPLETE (2025-11-19)**

- ✅ Days 1-2: Family service authorization tests (Issue #57, PR #57)
- ✅ Days 3-4: Invitation service authorization tests (Issue #48, PR #59)
- ✅ Day 5: User and role service authorization tests (Issue #49)
- ✅ Refactoring: Extract shared `isAdmin()` helper (commit 6cb936c1)

**⏳ Week 2: Input Validation Testing - PARTIALLY COMPLETE (2025-11-19)**

- ✅ Days 1-2: Format validation and boundary value tests for createFamily and createUser (Issue #50, PR #60)
- ✅ Code review and bug fixes (password validation refactoring)
- ⏳ Remaining: SQL injection tests, XSS sanitization, additional services (invitations, auth, roles)

**Week 3: Concurrency & Session Management**

- Days 1-2: Concurrency tests (unique constraints, race conditions)
- Days 3-5: Session management tests (tokens, verification)

**Week 4: Edge Cases & Wrap-Up**

- Days 1-3: Edge case tests (non-existent resources, special chars)
- Day 4: Review, refactor, optimize
- Day 5: Completion report and documentation

**Total Estimated Time:** 4 weeks (flexible, can be faster or slower)

---

## Best Practices

### Security Testing Best Practices

1. **Test Real Security Mechanisms**: Use real database constraints, not mocks
2. **Verify Error Types**: Ensure proper error types (401 vs 403 vs 400)
3. **Check Database State**: Verify unauthorized operations don't modify data
4. **Test Positive and Negative Cases**: Test both success and failure paths
5. **Use Realistic Payloads**: Test actual attack patterns

### Test Quality Best Practices

1. **Clear Test Names**: Describe what is being tested and expected outcome
2. **Arrange-Act-Assert**: Follow consistent test structure
3. **Independent Tests**: Each test should be self-contained
4. **Minimal Setup**: Only create data necessary for the test
5. **Verify Database State**: Always check database after operations

### Performance Best Practices

1. **Transaction Isolation**: Continue using `withTestTransaction()`
2. **Parallel Execution**: Tests should be safe to run in parallel
3. **Fast Tests**: Aim for <15 seconds total execution time
4. **Minimal Data**: Create only necessary test data

---

## Advanced Test Fixtures

> **✅ STATUS UPDATE (2025-11-18):** All Phase 3 advanced test fixtures have been implemented. User and role fixtures (`createTestAdminUser`, `createTestUserWithRole`) were implemented in PR #54. Family fixtures (`createFamilyWithMembers`, `createComplexFamily`) were implemented in PR #55. Invitation/session fixtures (`createValidInvitation`, `createExpiredInvitation`, `createUsedInvitation`) were implemented in PR #56. All fixtures are ready to use. **Part 1 (Foundational Work) of Phase 3 is now complete.**

### Overview

As Phase 3 tests grow in complexity, particularly for authorization and role-based access control, creating rich test data becomes repetitive. Advanced test fixtures provide reusable helpers that simplify test setup and keep tests focused on assertions.

### Fixture Design Principles

1. **Descriptive Names**: Fixture names should clearly indicate what they create
2. **Flexible Options**: Support optional parameters for customization
3. **Transaction-Aware**: All fixtures accept `tx` parameter for isolation
4. **Composable**: Fixtures can call other fixtures
5. **Return Useful Data**: Return created objects for use in tests

### Recommended Fixtures for Phase 3

#### User Fixtures with Roles

> **✅ IMPLEMENTED (PR #54):** These fixtures are now available in `test/utils/fixtures.ts` and exported via `test/utils/index.ts`.

**File:** `test/utils/fixtures.ts`

**Implementation Details:**

- Both functions accept optional `email`, `username`, and `password` parameters
- Use timestamp-based defaults for uniqueness (`${roleName}${Date.now()}@example.com`)
- Smart role reuse: checks for existing roles before creating new ones
- Maintains transaction isolation via `TestTransaction` parameter
- 18 comprehensive tests in `test/nuxt/utils/advanced-fixtures.spec.ts`

**Usage Example:**

```typescript
// Create admin user with defaults
const admin = await createTestAdminUser(tx);

// Create admin user with custom options
const customAdmin = await createTestAdminUser(tx, {
    email: "admin@example.com",
    username: "admin",
    password: "secure123",
});

// Create user with specific role
const manager = await createTestUserWithRole(tx, "manager");

// Create multiple users with same role (role is reused)
const dev1 = await createTestUserWithRole(tx, "developer");
const dev2 = await createTestUserWithRole(tx, "developer");
```

**API Signature:**

```typescript
export async function createTestAdminUser(
    tx: TestTransaction,
    options?: Partial<{
        email: string;
        username: string;
        password: string;
    }>,
): Promise<User>;

export async function createTestUserWithRole(
    tx: TestTransaction,
    roleName: string,
    options?: Partial<{
        email: string;
        username: string;
        password: string;
    }>,
): Promise<User>;
```

#### Family Fixtures with Members

> **✅ IMPLEMENTED (PR #55):** These fixtures are now available in `test/utils/fixtures.ts` and exported via `test/utils/index.ts`.

**File:** `test/utils/fixtures.ts`

**Implementation Details:**

- `createFamilyWithMembers` accepts `creator` and optional `members`, `managers`, and `name` parameters
- `createComplexFamily` auto-generates creator with defaults: 1 manager + 2 regular members
- Returns categorized arrays: `{ family, members, managers, regularMembers }`
- Creator is added to family as manager but not included in returned member arrays (arrays only contain additional members beyond creator)
- Use timestamp-based default names for uniqueness (`Test Family ${Date.now()}`)
- Maintains transaction isolation via `TestTransaction` parameter
- 14 comprehensive tests in `test/nuxt/utils/advanced-fixtures.spec.ts`

**Usage Example:**

```typescript
// Create family with custom member structure
const creator = await createTestUser(tx);
const { family, managers, regularMembers } = await createFamilyWithMembers(
    tx,
    creator,
    { managers: 2, members: 3 },
);

// Test cross-family access control
const family1 = await createComplexFamily(tx, { name: "Family 1" });
const family2 = await createComplexFamily(tx, { name: "Family 2" });

await expect(
    someService(tx, family1.creator.id, family2.family.id),
).rejects.toThrow(ForbiddenError);

// Test role-based permissions
const { family, managers, regularMembers } = await createFamilyWithMembers(
    tx,
    creator,
    { managers: 2, members: 3 },
);

await performManagerAction(tx, managers[0].user.id, family.id); // succeeds
await expect(
    performManagerAction(tx, regularMembers[0].user.id, family.id),
).rejects.toThrow(ForbiddenError);
```

**API Signature:**

```typescript
export async function createFamilyWithMembers(
    tx: TestTransaction,
    creator: { id: string },
    options?: {
        members?: number;
        managers?: number;
        name?: string;
    },
): Promise<{
    family: Family;
    members: Array<{ user: User; role: string }>;
    managers: Array<{ user: User; role: string }>;
    regularMembers: Array<{ user: User; role: string }>;
}>;

export async function createComplexFamily(
    tx: TestTransaction,
    options?: {
        name?: string;
        withManagers?: number;
        withMembers?: number;
    },
): Promise<{
    creator: User;
    family: Family;
    members: Array<{ user: User; role: string }>;
    managers: Array<{ user: User; role: string }>;
    regularMembers: Array<{ user: User; role: string }>;
}>;
```

#### Session and Token Fixtures

> **✅ IMPLEMENTED (PR #56):** These fixtures are now available in `test/utils/fixtures.ts` and exported via `test/utils/index.ts`.

**File:** `test/utils/fixtures.ts`

**Implementation Details:**

- All fixtures use `randomUUID()` from Node crypto module for secure token generation
- Timestamp-based email uniqueness (`invited-${Date.now()}@example.com`) prevents collisions
- Support flexible expiration timing via optional parameters
- Maintain transaction isolation via `TestTransaction` parameter
- 21 comprehensive tests in `test/nuxt/utils/invitation-fixtures.spec.ts`

**Usage Examples:**

```typescript
// Create valid (unexpired, pending) invitation with defaults
const validInvitation = await createValidInvitation(tx, familyId, managerId);
expect(validInvitation.status).toBe("pending");
expect(validInvitation.expires_at.getTime()).toBeGreaterThan(Date.now());

// Create valid invitation with custom expiration and email
const customInvitation = await createValidInvitation(tx, familyId, managerId, {
    invitedEmail: "specific@example.com",
    expiresInDays: 14,
});

// Create expired invitation for testing expiration validation
const expiredInvitation = await createExpiredInvitation(
    tx,
    familyId,
    managerId,
);
expect(expiredInvitation.expires_at.getTime()).toBeLessThan(Date.now());

// Create invitation expired specific days ago
const oldInvitation = await createExpiredInvitation(tx, familyId, managerId, {
    expiredDaysAgo: 5,
});

// Create used invitation for testing reuse prevention
const usedInvitation = await createUsedInvitation(tx, familyId, managerId, {
    status: "accepted",
});
expect(usedInvitation.status).toBe("accepted");

// Create invitation with different statuses
const declinedInvitation = await createUsedInvitation(tx, familyId, managerId, {
    status: "declined",
});
const cancelledInvitation = await createUsedInvitation(
    tx,
    familyId,
    managerId,
    {
        status: "cancelled",
    },
);
```

**API Signatures:**

```typescript
createValidInvitation(
    tx: TestTransaction,
    familyId: string,
    invitedByUserId: string,
    options?: {
        invitedEmail?: string;
        expiresInDays?: number; // Default: 7
    }
): Promise<FamilyInvitation>;

createExpiredInvitation(
    tx: TestTransaction,
    familyId: string,
    invitedByUserId: string,
    options?: {
        invitedEmail?: string;
        expiredDaysAgo?: number; // Default: 1
    }
): Promise<FamilyInvitation>;

createUsedInvitation(
    tx: TestTransaction,
    familyId: string,
    invitedByUserId: string,
    options?: {
        invitedEmail?: string;
        status?: "accepted" | "declined" | "expired" | "cancelled"; // Default: "accepted"
        expiresInDays?: number; // Default: 7
    }
): Promise<FamilyInvitation>;
```

### Using Advanced Fixtures in Tests

#### Before: Manual Setup

```typescript
it("should prevent regular member from creating invitation", async () => {
    await withTestTransaction(async (tx) => {
        // Lots of setup code
        const creator = await createTestUser(tx);
        const family = await createTestFamily(tx, creator.id);

        const member = await createTestUser(tx);
        await tx.insert(familyMembers).values({
            family_id: family.id,
            user_id: member.id,
            role: "member",
        });

        // Finally, the actual test
        await expect(
            createInvitation(tx, member.id, {
                familyId: family.id,
                email: "invited@example.com",
            }),
        ).rejects.toThrow(ForbiddenError);
    });
});
```

#### After: Using Fixtures

```typescript
it("should prevent regular member from creating invitation", async () => {
    await withTestTransaction(async (tx) => {
        // Clean, focused setup
        const { family, regularMembers } = await createFamilyWithMembers(
            tx,
            await createTestUser(tx),
            { members: 1 },
        );

        const member = regularMembers[0].user;

        // Test is now the focus
        await expect(
            createInvitation(tx, member.id, {
                familyId: family.id,
                email: "invited@example.com",
            }),
        ).rejects.toThrow(ForbiddenError);
    });
});
```

### Benefits of Advanced Fixtures

1. **Reduced Boilerplate**: Complex setup condensed into single function calls
2. **Consistency**: Same setup logic across all tests
3. **Readability**: Tests focus on "Act" and "Assert" steps
4. **Maintainability**: Changes to setup logic centralized in fixtures
5. **Reusability**: Fixtures usable across all Phase 3 test categories

### Fixture Guidelines

**Do:**

- Create fixtures for commonly used test scenarios
- Make fixtures configurable with optional parameters
- Document what each fixture creates
- Use descriptive names (e.g., `createExpiredInvitation`)
- Return all created objects for test assertions

**Don't:**

- Create fixtures for one-off scenarios
- Make fixtures too complex or hard to understand
- Hide important test setup in fixtures
- Create fixtures that are harder to use than manual setup

---

## Examples by Service

### Family Service Security Tests

**File:** `test/nuxt/services/families.spec.ts`

Add these test suites to the existing file:

```typescript
describe("Family Service - Security & Edge Cases", () => {
    describe("createFamily - Authorization", () => {
        it("should throw UnauthorizedError for null userId", async () => {
            await withTestTransaction(async (tx) => {
                await expect(
                    createFamily(tx, null as any, { name: "Test" }),
                ).rejects.toThrow(UnauthorizedError);
            });
        });
    });

    describe("createFamily - Input Validation", () => {
        it("should safely handle SQL injection in name", async () => {
            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx);
                const payload = "'; DROP TABLE families; --";

                const family = await createFamily(tx, user.id, {
                    name: payload,
                });

                expect(family.name).toBe(payload);

                // Verify table still exists
                const families = await tx.query.families.findMany();
                expect(families).toBeDefined();
            });
        });

        it("should reject empty family name", async () => {
            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx);

                await expect(
                    createFamily(tx, user.id, { name: "" }),
                ).rejects.toThrow(ValidationError);
            });
        });
    });

    describe("deleteFamily - Authorization", () => {
        it("should allow creator to delete family", async () => {
            await withTestTransaction(async (tx) => {
                const creator = await createTestUser(tx);
                const family = await createTestFamily(tx, creator.id);

                const result = await deleteFamily(tx, creator.id, family.id);
                expect(result.success).toBe(true);
            });
        });

        it("should prevent non-creator from deleting family", async () => {
            await withTestTransaction(async (tx) => {
                const creator = await createTestUser(tx);
                const family = await createTestFamily(tx, creator.id);

                const otherUser = await createTestUser(tx);

                await expect(
                    deleteFamily(tx, otherUser.id, family.id),
                ).rejects.toThrow(ForbiddenError);
            });
        });
    });

    describe("getFamily - Edge Cases", () => {
        it("should throw NotFoundError for non-existent family", async () => {
            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx);
                const nonExistentId = "00000000-0000-0000-0000-000000000000";

                await expect(
                    getFamily(tx, user.id, nonExistentId),
                ).rejects.toThrow(NotFoundError);
            });
        });
    });
});
```

---

## Next Steps

### Immediate Actions

1. **Review This Guide**: Understand the scope and approach
2. **Prioritize Categories**: Decide which test categories are most critical
3. **Start with Authorization**: Begin with authorization tests (most critical)
4. **Incremental Progress**: Add tests gradually, one category at a time

### After Phase 3 Completion

1. **Phase 4: Performance Testing** (Optional)
    - Load testing
    - Query optimization
    - Caching strategies

2. **Phase 5: Integration Testing** (Optional)
    - End-to-end workflow tests
    - Cross-service integration tests
    - UI integration tests

3. **Continuous Improvement**
    - Monitor test coverage
    - Add tests for new features
    - Refactor tests as patterns emerge

---

## Future Work: Phase 4 Considerations

### Overview

Phase 3 focuses on core security testing (authorization, input validation, concurrency, session management, and edge cases). However, several important security and robustness topics are intentionally deferred to future work. These could become **Phase 4** or separate focused tasks/sprints.

### Deferred Security Topics

#### 1. Rate Limiting & Abuse Prevention

**Scope:**

- Brute force attack prevention (login attempts)
- Account creation throttling
- Invitation spam prevention
- API endpoint rate limiting
- DDoS protection

**Why Deferred:**

- May require infrastructure-level solutions (nginx, middleware)
- Time-based testing more complex than transaction-based tests
- Often handled outside service layer
- Requires production monitoring/metrics infrastructure

**Recommended Approach:**

- Implement at middleware layer (H3 middleware, nginx)
- Use Redis or similar for distributed rate limiting
- Test with time-mocking or integration tests
- Monitor in production with observability tools

#### 2. Password Reset Flow

**Scope:**

- Secure token generation for password reset
- Token expiration and invalidation
- Email delivery verification
- Prevention of account enumeration
- Rate limiting password reset requests

**Why Deferred:**

- Feature may not be fully implemented yet
- Builds on email verification patterns from Phase 3
- Can be added when feature is implemented

**Recommended Approach:**

- Follow same patterns as email verification (Phase 3)
- Test token generation, validation, expiration
- Verify account enumeration prevention (same error for valid/invalid emails)

#### 3. CSRF Protection

**Scope:**

- CSRF token generation and validation
- Proper token rotation
- SameSite cookie configuration
- State-changing operation protection

**Why Deferred:**

- Framework-level concern (Nuxt/H3 may handle automatically)
- Frontend integration required
- Cookie configuration testing complex

**Recommended Approach:**

- Verify framework's built-in CSRF protection
- Add tests if implementing custom CSRF tokens
- Test in integration/E2E tests, not unit tests

#### 4. Session Security Advanced Topics

**Scope:**

- Session fixation prevention
- Concurrent session management (multiple devices)
- "Remember me" functionality security
- Session invalidation on password change
- Secure cookie flags (HttpOnly, Secure, SameSite)

**Why Deferred:**

- Some features may not be implemented yet
- Requires comprehensive session management system
- Cookie security partially framework responsibility

**Recommended Approach:**

- Implement incrementally as features are added
- Test at integration level (cookie behavior)
- Verify secure defaults in production

#### 5. Advanced Authorization Scenarios

**Scope:**

- Hierarchical permissions (family admins, super admins)
- Permission inheritance
- Conditional permissions (time-based, location-based)
- Delegated permissions
- Permission caching and invalidation

**Why Deferred:**

- Application may not require this complexity yet
- Can build on Phase 3 RBAC patterns
- Add incrementally as requirements emerge

**Recommended Approach:**

- Extend service layer authorization checks
- Use same testing patterns from Phase 3
- Document permission model clearly

#### 6. Data Privacy & Compliance

**Scope:**

- GDPR right to access (data export)
- GDPR right to erasure (data deletion)
- GDPR right to rectification
- Data retention policies
- Audit logging for data access
- Consent management

**Why Deferred:**

- Some features already implemented (soft delete, anonymization from Phase 1)
- Comprehensive GDPR compliance requires legal review
- Audit logging may require infrastructure changes

**Recommended Approach:**

- Build on existing soft-delete and anonymization
- Add audit logging for sensitive operations
- Test data export completeness
- Test deletion cascades correctly

#### 7. Performance & Load Testing

**Scope:**

- Load testing critical endpoints
- Database query optimization
- N+1 query detection
- Caching strategies
- Connection pool management
- Query timeout handling

**Why Deferred:**

- Different testing approach (load testing tools)
- Requires production-like environment
- Performance baselines needed first

**Recommended Approach:**

- Use tools like k6, Artillery, or Apache JMeter
- Test with realistic data volumes
- Monitor database query performance
- Optimize based on production metrics

### Phase 4 Decision Matrix

| Topic                  | Priority | Complexity | Dependencies                    |
| ---------------------- | -------- | ---------- | ------------------------------- |
| Rate Limiting          | High     | Medium     | Redis/middleware infrastructure |
| Password Reset         | Medium   | Low        | Phase 3 patterns                |
| CSRF Protection        | Medium   | Low        | Framework capabilities review   |
| Session Security       | Medium   | Medium     | Session infrastructure          |
| Advanced Authorization | Low      | Medium     | Business requirements           |
| Data Privacy/GDPR      | High     | High       | Legal review, audit logging     |
| Performance Testing    | Medium   | High       | Production metrics baseline     |

### Recommendation

After Phase 3 completion:

1. **Assess Current Gaps**: Review security audit or penetration test results
2. **Prioritize Based on Risk**: Focus on highest risk items first
3. **Group by Theme**: Create focused sprints (e.g., "Rate Limiting & Abuse Prevention Sprint")
4. **Incremental Implementation**: Don't try to do everything at once

**Suggested Next Phase:**

- **Phase 4a: Rate Limiting & Abuse Prevention** (Highest security impact)
- **Phase 4b: Data Privacy & Compliance** (Legal/regulatory requirement)
- **Phase 4c: Performance & Optimization** (User experience impact)

### Integration with Phase 3

Some Phase 4 topics can begin during Phase 3:

- **Session Management tests** in Phase 3 lay groundwork for advanced session security
- **Authorization tests** in Phase 3 can be extended for hierarchical permissions
- **Edge case tests** in Phase 3 test handling of unusual inputs needed for abuse prevention

---

## Conclusion

Phase 3 builds on the solid foundation from Phase 2 by adding comprehensive security and edge case testing. The service layer pattern makes it easy to test authorization, input validation, concurrency, and session management without complex mocking or E2E infrastructure.

**Key Advantages of Phase 3:**

- ✅ Comprehensive security coverage
- ✅ Protection against common vulnerabilities
- ✅ Confidence in error handling
- ✅ Fast, isolated tests with transactions
- ✅ Clear testing patterns for future features
- ✅ Real database testing without pollution

**Implementation Philosophy:**

- Incremental progress over big-bang approach
- Test real security mechanisms, not mocks
- Clear, maintainable test patterns
- Focus on critical paths first
- No pressure timeline

**Ready to begin Phase 3?** Start with authorization testing for the most critical services (families, invitations) and expand from there.

---

## Phase 3 Completion Status

**Phase 3 Status: IN PROGRESS** (3.5 of 5 parts complete - 70%)

### Completed Parts

#### Part 2: Authorization Testing ✅ (2025-11-19)

- 34 authorization tests across 4 services
- Shared authorization test utilities
- All tests passing

#### Part 3: Input Validation ⏳ (2025-11-19 - Partially Complete)

- PR #60: 13 tests for `createFamily` and `createUser`
- Validation patterns established
- **Remaining:** Other service functions need input validation tests

#### Part 4: Concurrency Testing ✅ (2025-11-19)

- **PR #61:** 10 comprehensive concurrency tests
- Implemented `acceptInvitation` function (server/services/invitations.ts)
- Test file: test/nuxt/services/concurrency.spec.ts
- All 240 tests passing, execution time 386ms
- **Coverage:**
    - ✅ Unique constraint enforcement (emails, usernames)
    - ✅ Duplicate prevention (family members, invitations)
    - ✅ Simultaneous operations
    - ✅ Invitation acceptance race conditions
    - ✅ Ownership transfer race conditions
    - ✅ Transaction isolation behavior
- **⚠️ Critical Finding:** Discovered race condition in `transferOwnership` function
    - No database constraint preventing concurrent transfers
    - Both concurrent operations can succeed (last write wins)
    - Requires future fix: optimistic locking, database constraint, or version control
    - Should be addressed in separate issue

#### Part 4: Session Management Testing ✅ (2025-11-19)

- **Issue #52** resolved with commit 7fca97fc
- Added 7 session management tests (3 auth + 4 invitations, 1 todo)
- Test files: test/nuxt/services/auth.spec.ts, test/nuxt/services/invitations.spec.ts
- Total: 248 passing tests
- **Coverage:**
    - ✅ Email verification token generation and validation
    - ✅ Invalid token rejection
    - ✅ Token reuse prevention
    - ✅ Invitation token uniqueness
    - ✅ Invitation expiration handling
    - ✅ Invitation invalidation after use
- **Note:** Email verification token expiration test marked as todo (sendVerificationEmail doesn't set expiration dates yet)

#### Part 5: Edge Case Testing ⏳ (2025-11-20 - Partially Complete)

- **PR #63 (Issue #53):** 14 edge case tests across all services
- Created `server/lib/validation.ts` with shared `findResourceOrThrow` helper
- Test files: families.spec.ts (+3), invitations.spec.ts (+6), users.spec.ts (+3), plus 4 TODO tests
- **Coverage:** ~30% overall
    - ✅ Non-existent resources (60%)
    - ✅ Soft-deleted managers (20%)
    - ✅ Unicode/special characters (70%)
    - 🟡 Empty collections (10%)
- **Security Fixes:**
    - Fixed UUID error handling (ValidationError vs NotFoundError)
    - Fixed username validation regex (\\p{S} → \\p{Emoji})
    - Fixed transferOwnership error types
- **Code Quality:** Reduced ~30 lines of duplicated error handling code
- **Remaining:** Deleted resources, min/max values, null handling, boundary conditions (deferred to follow-up issues)

### Remaining Parts

#### Part 3: Input Validation (Continuation)

- [ ] Complete input validation tests for remaining service functions
- [ ] Test SQL injection prevention
- [ ] Test XSS prevention
- [ ] Test malformed data handling

#### Part 5: Edge Case Testing (Continuation)

- [ ] Deleted resources tests (0%)
- [ ] Minimum/maximum value tests (0%)
- [ ] Null handling tests (0%)
- [ ] Boundary condition tests (0%)
- [ ] Expand soft-delete coverage (from 20% to 80%)
- [ ] Complete empty collection tests (waiting for getter functions)

---

**Current Progress: 70% Complete** (3.5 of 5 parts done)
**Status:** Part 5 foundation established with PR #63
**Dependencies: Phase 2 completion ✅**
