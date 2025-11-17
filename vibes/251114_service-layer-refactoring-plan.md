---
title: "Service Layer Refactoring Plan: Solving Phase 2 Test Blocker Through Architectural Improvement"
date: 2025-11-14
status: proposal
author: Claude
related_documents:
    - vibes/251113_test-refactoring-plan.md
    - vibes/251113_phase2-implementation-guide.md
    - PHASE2_BLOCKER_ANALYSIS.md
tags:
    - architecture
    - testing
    - refactoring
    - service-layer
priority: high
---

# Service Layer Refactoring Plan

## Executive Summary

**Problem:** Phase 2 test refactoring is blocked because transaction-based testing is incompatible with E2E server architecture. Tests cannot see uncommitted transaction data from a separate process.

**Solution:** Extract business logic into a service layer that accepts database connections as parameters. Services can use either production `db` or test `tx` (transaction), enabling transaction-based testing without E2E complexity.

**Outcome:** Solves testing blocker while significantly improving codebase architecture, maintainability, testability, and following industry best practices.

**Timeline:** Flexible, incremental migration (no pressure)

---

## Table of Contents

1. [Problem Analysis](#problem-analysis)
2. [Proposed Solution](#proposed-solution)
3. [Architecture Overview](#architecture-overview)
4. [Benefits](#benefits)
5. [Implementation Phases](#implementation-phases)
6. [Code Examples](#code-examples)
7. [Migration Strategy](#migration-strategy)
8. [Testing Strategy](#testing-strategy)
9. [Risk Analysis & Mitigation](#risk-analysis--mitigation)
10. [Success Metrics](#success-metrics)
11. [Decision Points](#decision-points)

---

## Problem Analysis

### Root Cause

**Transaction isolation is fundamentally incompatible with E2E testing:**

```typescript
// This pattern CANNOT work:
await withTestTransaction(async (tx) => {
    const user = await createTestUser(tx); // Data in Process A (test)
    await $fetch("/api/test/login", {
        // Request to Process B (E2E server)
        body: { userId: user.id }, // Process B can't see uncommitted data
    });
    // Result: "User not found" error
});
```

### Why Current Approaches Fail

| Approach            | Issue                                          |
| ------------------- | ---------------------------------------------- |
| "nuxt" environment  | Real API routes not loaded, only mocks work    |
| E2E setup           | Test data invisible to separate server process |
| registerEndpoint    | Doesn't affect E2E server                      |
| Hybrid combinations | Still hit transaction isolation wall           |

### Current Architecture Limitations

**Endpoints are monolithic:**

- Authentication, validation, business logic, and database operations all mixed together
- Impossible to test business logic independently of HTTP layer
- No separation of concerns
- Difficult to reuse logic outside HTTP context

**Example:** `server/api/families/index.post.ts` (67 lines)

- Lines 13-21: Authentication check
- Lines 23-33: Validation
- Lines 38-57: Business logic + database operations (in transaction)
- Lines 60-66: Error handling

Everything is tightly coupled to the H3 event handler.

---

## Proposed Solution

### Core Concept: Service Layer Architecture

Extract business logic into **services** that:

1. **Accept database connection as parameter** (production `db` OR test `tx`)
2. **Contain all business logic** (authorization, data operations, business rules)
3. **Are framework-agnostic** (no H3, no HTTP, pure TypeScript)
4. **Throw domain errors** (not HTTP errors)
5. **Return typed data** (not HTTP responses)

### How This Solves The Testing Problem

**Tests can call services directly with test transactions:**

```typescript
// No HTTP layer, no E2E, pure service + transaction testing
await withTestTransaction(async (tx) => {
    const user = await createTestUser(tx);

    // Call service directly, passing test transaction
    const family = await familyService.createFamily(tx, user.id, {
        name: "Test Family",
    });

    // Verify result
    expect(family.name).toBe("Test Family");

    // Verify database state
    const dbFamily = await tx.query.families.findFirst({
        where: eq(families.id, family.id),
    });
    expect(dbFamily?.creator_id).toBe(user.id);

    // Transaction rolls back automatically
});
```

**No E2E server, no authentication mocking, no HTTP layer - just pure business logic testing!**

---

## Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────────┐
│   API Routes (server/api/)              │
│   - Parse HTTP requests                 │
│   - Validate input (Zod schemas)        │
│   - Authenticate users                  │
│   - Call services                       │
│   - Translate errors to HTTP responses  │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│   Services (server/services/)           │
│   - Business logic                      │
│   - Authorization checks                │
│   - Database operations                 │
│   - Domain error throwing               │
│   - Framework-agnostic                  │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│   Database (server/db/)                 │
│   - Drizzle ORM                         │
│   - Schema definitions                  │
│   - Migrations                          │
└─────────────────────────────────────────┘
```

### Directory Structure

```
server/
├── api/                    # HTTP route handlers (thin)
│   ├── families/
│   │   ├── index.get.ts    # Calls familyService.getUserFamilies()
│   │   ├── index.post.ts   # Calls familyService.createFamily()
│   │   └── [id]/
│   └── ...
├── services/               # Business logic (NEW)
│   ├── families.ts         # Family operations
│   ├── invitations.ts      # Invitation operations
│   ├── users.ts            # User operations
│   ├── roles.ts            # Role operations
│   └── auth.ts             # Authentication operations
├── lib/                    # Shared utilities (NEW)
│   ├── errors.ts           # Domain error classes
│   └── types.ts            # Shared types (DbConnection, etc.)
├── db/                     # Database layer
└── utils/                  # Utilities (logger, email, etc.)
```

---

## Benefits

### 1. Solves Testing Blocker ✅

- Services testable with `withTestTransaction()`
- No E2E complexity
- Transaction isolation works perfectly
- Fast, reliable tests

### 2. Improves Code Organization ✅

- Clear separation of concerns
- Business logic isolated from HTTP layer
- Easier to understand and maintain
- Follows industry best practices

### 3. Enhances Testability ✅

- Services are pure functions (easy to test)
- No mocking required for database operations
- Authorization logic testable independently
- Unit tests for business logic, integration tests for routes

### 4. Enables Reusability ✅

- Services can be called from:
    - HTTP routes
    - GraphQL resolvers (if added later)
    - Background jobs
    - CLI commands
    - WebSocket handlers

### 5. Better Error Handling ✅

- Domain errors separate from HTTP errors
- Clearer error semantics
- Easier to test error conditions
- Consistent error handling across layers

### 6. Improved Type Safety ✅

- Services have clear input/output types
- Database connection abstraction properly typed
- Compile-time guarantees

### 7. Follows Best Practices ✅

- Clean Architecture principles
- Hexagonal Architecture (ports & adapters)
- Domain-Driven Design patterns
- SOLID principles

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal:** Set up infrastructure for service layer

#### Tasks:

- [ ] Create `server/lib/types.ts` with `DbConnection` type
- [ ] Create `server/lib/errors.ts` with domain error classes
- [ ] **Create custom ESLint rules to enforce architecture** (PRIORITY)
    - [ ] `no-global-db-in-services` - Prevent `import { db }` in services
    - [ ] `no-db-transaction-in-services` - Prevent `db.transaction()` in services
    - [ ] `require-db-connection-param` - Enforce dbConnection parameter
- [ ] Create `server/services/` directory
- [ ] Extract first service: `families.ts` with `createFamily()`
- [ ] Refactor `server/api/families/index.post.ts` to use service
- [ ] Write service tests for `createFamily()`
- [ ] Update documentation

**Deliverables:**

- Working service layer pattern established
- ESLint rules enforcing architecture
- One endpoint fully refactored
- Tests demonstrate pattern works
- Team understands approach

---

### Phase 2: Core Services Migration (Weeks 2-4)

**Goal:** Migrate all family-related endpoints

#### Priority 1: Families Service

- [ ] `getUserFamilies()` - GET /api/families
- [ ] `createFamily()` - POST /api/families (already done in Phase 1)
- [ ] `getFamily()` - GET /api/families/[id]
- [ ] `deleteFamily()` - DELETE /api/families/[id]
- [ ] `transferOwnership()` - POST /api/families/[id]/transfer-ownership

#### Priority 2: Family Members Service

- [ ] `getFamilyMembers()` - GET /api/families/[familyId]/members
- [ ] `removeFamilyMember()` - DELETE /api/families/[familyId]/members/[userId]

#### Priority 3: Invitations Service

- [ ] `createInvitation()` - POST /api/families/[familyId]/invitations
- [ ] `getUserInvitations()` - GET /api/invitations
- [ ] `acceptInvitation()` - POST /api/invitations/[token]/accept
- [ ] `declineInvitation()` - POST /api/invitations/[token]/decline

**Strategy:** One service at a time, with tests after each

---

### Phase 3: Admin Services Migration (Week 5)

**Goal:** Migrate admin endpoints

#### Users Service

- [ ] `getUsers()` - GET /api/admin/users
- [ ] `getUser()` - GET /api/admin/users/[id]
- [ ] `createUser()` - POST /api/admin/users
- [ ] `updateUser()` - PUT /api/admin/users/[id]
- [ ] `deleteUser()` - DELETE /api/admin/users/[id]
- [ ] `resetUserPassword()` - POST /api/admin/users/[id]/reset-password
- [ ] `updateUserStatus()` - PUT /api/admin/users/[id]/status

#### Roles Service

- [ ] `getRoles()` - GET /api/admin/roles
- [ ] `getRole()` - GET /api/admin/roles/[id]
- [ ] `createRole()` - POST /api/admin/roles
- [ ] `updateRole()` - PUT /api/admin/roles/[id]
- [ ] `deleteRole()` - DELETE /api/admin/roles/[id]

---

### Phase 4: Auth Services Migration (Week 6)

**Goal:** Migrate authentication endpoints

#### Auth Service

- [ ] `loginWithCredentials()` - POST /api/auth/credentials
- [ ] `sendVerificationEmail()` - POST /api/auth/send-verification
- [ ] `verifyEmail()` - POST /api/auth/verify-email

**Note:** Authentication is sensitive, requires extra care

---

### Phase 5: Test Suite Completion (Weeks 7-8)

**Goal:** Complete Phase 2 test refactoring with new service tests

#### Convert Old Tests

- [ ] Remove old endpoint mock tests
- [ ] Write comprehensive service tests
- [ ] Add integration smoke tests for critical paths
- [ ] Achieve 100% coverage of business logic

#### Validation

- [ ] All tests pass (125+)
- [ ] No flaky tests
- [ ] Fast execution (< 30 seconds)
- [ ] Can run in parallel

---

## Code Examples

### Before: Monolithic Endpoint

**File:** `server/api/families/index.post.ts` (current)

```typescript
export default defineEventHandler(async (event) => {
    // Authentication
    const user = event.context.user;
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }

    // Validation
    const parseResult = await readValidatedBody(event, (body) =>
        FamilyCreateSchema.safeParse(body),
    );
    if (!parseResult.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Validation failed",
            data: parseResult.error.issues,
        });
    }

    const { name } = parseResult.data;

    // Business logic + database operations
    try {
        const newFamily = await db.transaction(async (tx) => {
            const [insertedFamily] = await tx
                .insert(families)
                .values({ name, creator_id: user.id })
                .returning();

            if (!insertedFamily) {
                throw new Error("Family creation failed during insert.");
            }

            await tx.insert(familyMembers).values({
                family_id: insertedFamily.id,
                user_id: user.id,
                role: "manager",
            });

            return insertedFamily;
        });

        return newFamily;
    } catch (error) {
        logger.error(`Error creating family for user ${user.id}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
```

**Problems:**

- 67 lines of tightly coupled code
- Impossible to test without HTTP layer
- Business logic buried in transaction callback
- Error handling mixes domain and HTTP concerns

---

### After: Layered Architecture

#### Service Layer

**File:** `server/services/families.ts` (NEW)

```typescript
import { eq } from "drizzle-orm";
import { families, familyMembers } from "#server/db/schema";
import type { DbConnection } from "#server/lib/types";
import { NotFoundError, UnauthorizedError } from "#server/lib/errors";
import { logger } from "#server/utils/logger";

/**
 * Creates a new family with the specified user as creator and manager.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @param userId - ID of the user creating the family
 * @param data - Family creation data
 * @returns The newly created family
 * @throws {ValidationError} If family name is invalid
 */
export async function createFamily(
    dbConnection: DbConnection,
    userId: string,
    data: { name: string },
) {
    // Business logic: Create family and add creator as manager
    const [insertedFamily] = await dbConnection
        .insert(families)
        .values({
            name: data.name,
            creator_id: userId,
        })
        .returning();

    if (!insertedFamily) {
        logger.error(`Family creation failed for user ${userId}`);
        throw new Error("Family creation failed during insert");
    }

    await dbConnection.insert(familyMembers).values({
        family_id: insertedFamily.id,
        user_id: userId,
        role: "manager",
    });

    logger.info(`Family created: ${insertedFamily.id} by user ${userId}`);

    return insertedFamily;
}

/**
 * Transfers family ownership to another member.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @param currentUserId - ID of the current owner
 * @param familyId - ID of the family
 * @param newOwnerId - ID of the new owner
 * @returns Success indicator
 * @throws {ForbiddenError} If current user is not the creator
 * @throws {NotFoundError} If family or new owner not found
 * @throws {ValidationError} If new owner is not a family member
 */
export async function transferOwnership(
    dbConnection: DbConnection,
    currentUserId: string,
    familyId: string,
    newOwnerId: string,
) {
    // Authorization: Verify current user is creator
    const family = await dbConnection.query.families.findFirst({
        where: eq(families.id, familyId),
    });

    if (!family) {
        throw new NotFoundError("Family not found");
    }

    if (family.creator_id !== currentUserId) {
        throw new UnauthorizedError(
            "Only the family creator can transfer ownership",
        );
    }

    // Business rule: New owner must be a member
    const membership = await dbConnection.query.familyMembers.findFirst({
        where: (members, { and, eq }) =>
            and(
                eq(members.family_id, familyId),
                eq(members.user_id, newOwnerId),
            ),
    });

    if (!membership) {
        throw new ValidationError("New owner must be a family member");
    }

    // Transfer ownership
    await dbConnection
        .update(families)
        .set({
            creator_id: newOwnerId,
            updated_at: new Date(),
        })
        .where(eq(families.id, familyId));

    logger.info(
        `Family ${familyId} ownership transferred from ${currentUserId} to ${newOwnerId}`,
    );

    return { success: true };
}

// ... other family service functions
```

#### Route Handler (Thin Wrapper)

**File:** `server/api/families/index.post.ts` (refactored)

```typescript
import { defineEventHandler, createError, readValidatedBody } from "h3";
import { db } from "#server/db";
import { FamilyCreateSchema } from "~~/shared/types/family";
import { createFamily } from "#server/services/families";
import { translateError } from "#server/lib/errors";

/**
 * @api {post} /api/families
 * @description Creates a new family
 */
export default defineEventHandler(async (event) => {
    // 1. Authentication
    const user = event.context.user;
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }

    // 2. Validation
    const parseResult = await readValidatedBody(event, (body) =>
        FamilyCreateSchema.safeParse(body),
    );

    if (!parseResult.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Validation failed",
            data: parseResult.error.issues,
        });
    }

    // 3. Call service within transaction
    try {
        const newFamily = await db.transaction(async (tx) => {
            return await createFamily(tx, user.id, parseResult.data);
        });

        return newFamily;
    } catch (error) {
        // 4. Translate domain errors to HTTP errors
        throw translateError(error);
    }
});
```

**Benefits:**

- Endpoint reduced from 67 to ~35 lines
- Business logic extracted and reusable
- Service is testable independently
- Clear separation of concerns

---

### Supporting Infrastructure

#### Type Definitions

**File:** `server/lib/types.ts` (NEW)

```typescript
import type { TestTransaction } from "#test/utils/db";
import type { db } from "#server/db";

/**
 * Database connection type that works for both production and tests.
 * Services accept this type to work with either regular db or test transactions.
 */
export type DbConnection = typeof db | TestTransaction;
```

#### Domain Errors

**File:** `server/lib/errors.ts` (NEW)

```typescript
import { createError } from "h3";

/**
 * Base class for domain errors
 */
export class DomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class UnauthorizedError extends DomainError {}
export class ForbiddenError extends DomainError {}
export class NotFoundError extends DomainError {}
export class ValidationError extends DomainError {}
export class ConflictError extends DomainError {}

/**
 * Translates domain errors to HTTP errors for route handlers.
 *
 * SECURITY NOTE: Domain errors are DESIGNED to expose their messages to users.
 * These messages are part of the API contract and are safe to show.
 *
 * System/unexpected errors are logged but return generic messages to prevent
 * information leakage.
 */
export function translateError(error: unknown) {
    // Domain errors: Safe to expose (designed for user consumption)
    if (error instanceof UnauthorizedError) {
        return createError({
            statusCode: 401,
            statusMessage: error.message, // Safe - domain error
        });
    }

    if (error instanceof ForbiddenError) {
        return createError({
            statusCode: 403,
            statusMessage: error.message, // Safe - domain error
        });
    }

    if (error instanceof NotFoundError) {
        return createError({
            statusCode: 404,
            statusMessage: error.message, // Safe - domain error
        });
    }

    if (error instanceof ValidationError) {
        return createError({
            statusCode: 400,
            statusMessage: error.message, // Safe - domain error
        });
    }

    if (error instanceof ConflictError) {
        return createError({
            statusCode: 409,
            statusMessage: error.message, // Safe - domain error
        });
    }

    // System/unexpected errors: Log but don't expose details
    logger.error("Unexpected service error:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : typeof error,
    });

    return createError({
        statusCode: 500,
        statusMessage: "An unexpected error occurred", // Generic message
    });
}
```

---

### Service Design Guidelines

#### Authorization in Services

**Guideline:** Services that perform sensitive operations MUST verify the caller has permission.

**What qualifies as "sensitive operations":**

- Write operations (create, update, delete)
- Accessing data that requires authorization (user-specific data, admin data)
- State-changing operations with security implications

**What doesn't require authorization in services:**

- Pure data utilities (format, transform, validate)
- Operations where authorization is handled by the caller (route handler)
- Operations on data already verified by authorization in the call chain

**Pattern for authorization in services:**

```typescript
// ✅ Good: Service checks authorization for sensitive operation
export async function transferOwnership(
    dbConnection: DbConnection,
    currentUserId: string, // Explicit: WHO is requesting this
    familyId: string,
    newOwnerId: string,
) {
    // MUST verify: Is currentUserId allowed to transfer this family?
    const family = await dbConnection.query.families.findFirst({
        where: eq(families.id, familyId),
    });

    if (!family) {
        throw new NotFoundError("Family not found");
    }

    if (family.creator_id !== currentUserId) {
        throw new ForbiddenError(
            "Only the family creator can transfer ownership",
        );
    }

    // ... proceed with operation
}

// ✅ Good: Authorization already handled by caller
export async function getFamilyMembers(
    dbConnection: DbConnection,
    familyId: string, // Caller already verified access to this family
) {
    // Pure data fetch, authorization done by route handler
    return await dbConnection.query.familyMembers.findMany({
        where: eq(familyMembers.family_id, familyId),
    });
}

// ✅ Good: Service-to-service call passes authorization context
export async function createInvitation(
    dbConnection: DbConnection,
    userId: string, // WHO is creating the invitation
    familyId: string,
    invitedEmail: string,
) {
    // This service checks if userId is a manager of familyId
    const membership = await getFamilyMembership(
        dbConnection,
        familyId,
        userId, // Pass authorization context through
    );

    if (membership?.role !== "manager") {
        throw new ForbiddenError("Only managers can send invitations");
    }

    // ... create invitation
}
```

**Key Principle:** If a service accepts a `userId` parameter, it should verify that user has permission to perform the operation. Don't trust the caller blindly.

#### Service-to-Service Calls

**Critical Rule:** When calling one service from another, always pass the transaction context.

```typescript
// ✅ Good: Pass transaction through
export async function deleteFamily(
    tx: DbConnection,
    userId: string,
    familyId: string,
) {
    // Check authorization
    const family = await getFamily(tx, familyId); // Pass tx!

    if (family.creator_id !== userId) {
        throw new ForbiddenError("Only creator can delete family");
    }

    // Delete related data
    await deleteFamilyMembers(tx, familyId); // Pass tx!
    await deleteFamilyInvitations(tx, familyId); // Pass tx!

    // Delete family
    await tx.delete(families).where(eq(families.id, familyId));
}

// ❌ Bad: Using global db instead of tx
export async function deleteFamily(
    tx: DbConnection,
    userId: string,
    familyId: string,
) {
    const family = await getFamily(db, familyId); // WRONG! Breaks transaction
    // ...
}
```

**ESLint will catch violations** of the no-global-db-in-services rule.

---

### Testing Examples

#### Service Test (What We Want)

**File:** `test/unit/services/families.spec.ts` (NEW)

```typescript
import { describe, expect, it } from "vitest";
import { withTestTransaction } from "#test/utils";
import { createTestUser } from "#test/utils/fixtures";
import { createFamily, transferOwnership } from "#server/services/families";
import {
    UnauthorizedError,
    NotFoundError,
    ValidationError,
} from "#server/lib/errors";
import { eq } from "drizzle-orm";
import { families, familyMembers } from "~~/server/db/schema";

describe("familyService.createFamily", () => {
    it("should create a family with creator as manager", async () => {
        await withTestTransaction(async (tx) => {
            // Arrange
            const user = await createTestUser(tx, {
                email: "creator@example.com",
                username: "creator",
            });

            // Act
            const family = await createFamily(tx, user.id, {
                name: "Test Family",
            });

            // Assert - verify return value
            expect(family).toBeDefined();
            expect(family.name).toBe("Test Family");
            expect(family.creator_id).toBe(user.id);

            // Assert - verify database state
            const dbFamily = await tx.query.families.findFirst({
                where: eq(families.id, family.id),
            });
            expect(dbFamily).toBeDefined();
            expect(dbFamily?.creator_id).toBe(user.id);

            // Assert - verify family membership created
            const membership = await tx.query.familyMembers.findFirst({
                where: (members, { and, eq }) =>
                    and(
                        eq(members.family_id, family.id),
                        eq(members.user_id, user.id),
                    ),
            });
            expect(membership).toBeDefined();
            expect(membership?.role).toBe("manager");
        });
    });
});

describe("familyService.transferOwnership", () => {
    it("should transfer ownership to another member", async () => {
        await withTestTransaction(async (tx) => {
            // Arrange
            const creator = await createTestUser(tx);
            const family = await createFamily(tx, creator.id, {
                name: "Test Family",
            });
            const newOwner = await createTestUser(tx);

            // Add new owner as member
            await tx.insert(familyMembers).values({
                family_id: family.id,
                user_id: newOwner.id,
                role: "member",
            });

            // Act
            await transferOwnership(tx, creator.id, family.id, newOwner.id);

            // Assert
            const updatedFamily = await tx.query.families.findFirst({
                where: eq(families.id, family.id),
            });
            expect(updatedFamily?.creator_id).toBe(newOwner.id);
        });
    });

    it("should throw UnauthorizedError if user is not creator", async () => {
        await withTestTransaction(async (tx) => {
            // Arrange
            const creator = await createTestUser(tx);
            const otherUser = await createTestUser(tx);
            const family = await createFamily(tx, creator.id, {
                name: "Test Family",
            });
            const newOwner = await createTestUser(tx);

            await tx.insert(familyMembers).values({
                family_id: family.id,
                user_id: newOwner.id,
                role: "member",
            });

            // Act & Assert
            await expect(
                transferOwnership(tx, otherUser.id, family.id, newOwner.id),
            ).rejects.toThrow(UnauthorizedError);
        });
    });

    it("should throw ValidationError if new owner is not a member", async () => {
        await withTestTransaction(async (tx) => {
            // Arrange
            const creator = await createTestUser(tx);
            const family = await createFamily(tx, creator.id, {
                name: "Test Family",
            });
            const nonMember = await createTestUser(tx);

            // Act & Assert
            await expect(
                transferOwnership(tx, creator.id, family.id, nonMember.id),
            ).rejects.toThrow(ValidationError);
        });
    });
});
```

**Benefits:**

- No HTTP layer, no mocking, pure business logic testing
- Clear arrange-act-assert pattern
- Tests both return values AND database state
- Error conditions easy to test
- Fast execution (no HTTP overhead)
- Transaction isolation (no cleanup needed)

---

## Migration Strategy

### Approach: Incremental, One Service at a Time

**Philosophy:** No big-bang rewrite. Migrate gradually with confidence.

### Step-by-Step Process

#### Step 1: Extract Service Function

1. Identify business logic in endpoint
2. Create service file (if doesn't exist)
3. Copy business logic to service function
4. Add proper TypeScript types
5. Change `db` to `dbConnection: DbConnection` parameter
6. Replace HTTP errors with domain errors

#### Step 2: Refactor Endpoint

1. Import service function
2. Keep authentication and validation in endpoint
3. Call service within `db.transaction()`
4. Wrap service call in try-catch
5. Translate domain errors to HTTP errors

#### Step 3: Write Service Tests

1. Create test file in `test/unit/services/`
2. Write happy path test
3. Write error condition tests
4. Write authorization tests
5. Verify all tests pass

#### Step 4: Update or Remove Endpoint Tests

1. Old endpoint tests using mocks can be removed
2. Keep a few integration smoke tests for critical paths
3. Most testing now happens at service layer

#### Step 5: Repeat

Move to next endpoint

### Validation Checklist (Per Service)

- [ ] Service function extracted
- [ ] Service accepts `DbConnection`
- [ ] Service throws domain errors (not HTTP)
- [ ] Endpoint refactored to use service
- [ ] Service tests written and passing
- [ ] No TypeScript errors
- [ ] Linter passes
- [ ] Documentation updated

---

## Testing Strategy

### Test Pyramid

```
        ┌────────────────┐
        │   Integration  │  ← Few: Critical path smoke tests
        │   (Route E2E)  │
        └────────────────┘
       ┌──────────────────┐
       │  Service Tests   │  ← Many: Business logic, DB state
       │  (w/ tx)         │
       └──────────────────┘
     ┌─────────────────────┐
     │    Unit Tests       │  ← Many: Pure functions, utilities
     │   (Pure logic)      │
     └─────────────────────┘
```

### Test Distribution

**Unit Tests:** Pure utilities, helpers, validators

- Fast, no database
- Test logic in isolation

**Service Tests:** Business logic with database

- Use `withTestTransaction()`
- Test real database operations
- Test authorization logic
- Test error conditions
- **This is where most tests live**

**Integration Tests:** Full HTTP request flow

- Minimal set for smoke testing
- Test critical user journeys
- Ensure layers work together

### Testing Best Practices

1. **Test services, not routes** - Business logic is in services
2. **Use transactions** - Fast, isolated, no cleanup
3. **Test database state** - Verify side effects
4. **Test error conditions** - Domain errors are testable
5. **Keep tests simple** - No complex mocking
6. **Parallelize** - Transaction isolation enables parallel tests

---

## Risk Analysis & Mitigation

### Risk 1: TypeScript Complexity with DbConnection

**Risk:** `DbConnection` type might not work smoothly with TypeScript

**Likelihood:** Low
**Impact:** Medium

**Mitigation:**

- Prototype type in Phase 1
- Test with both `db` and `tx`
- Verify type inference works
- Document any type assertions needed

**Contingency:** Use overloads or generics if union type problematic

---

### Risk 2: Nested Transaction Issues

**Risk:** Services might try to start transactions when already in one

**Likelihood:** Medium (if not careful)
**Impact:** High (runtime errors)

**Mitigation:**

- **Design decision:** Services NEVER start transactions
- Transactions always managed by caller (route or test)
- Document this pattern clearly
- Code reviews enforce pattern

**Pattern:**

```typescript
// Route: Start transaction, call service
await db.transaction(tx => familyService.createFamily(tx, ...));

// Test: Use test transaction, call service
await withTestTransaction(async (tx) => {
    await familyService.createFamily(tx, ...);
});
```

---

### Risk 3: Team Learning Curve

**Risk:** Team unfamiliar with layered architecture

**Likelihood:** Medium
**Impact:** Medium

**Mitigation:**

- Clear documentation with examples
- Phase 1 establishes pattern
- Pair programming during migration
- Code reviews share knowledge
- Regular check-ins

---

### Risk 4: External Service Dependencies

**Risk:** Services like email sender need to be injectable for tests

**Likelihood:** High
**Impact:** Low

**Mitigation:**

- Pass external services as parameters
- Keep mocking them in tests
- Example: `sendInvitationEmail` passed to service

**Pattern:**

```typescript
// Service accepts email sender as parameter
export async function createInvitation(
    dbConnection: DbConnection,
    data: InvitationData,
    emailSender: typeof sendInvitationEmail
) {
    // ... create invitation
    await emailSender({ to: data.email, ... });
}

// Test mocks email sender
const mockEmailSender = vi.fn();
await createInvitation(tx, data, mockEmailSender);
expect(mockEmailSender).toHaveBeenCalled();
```

---

### Risk 5: Migration Taking Too Long

**Risk:** Full migration might take months

**Likelihood:** Low (with incremental approach)
**Impact:** Low (interim state is fine)

**Mitigation:**

- Incremental migration is safe
- Old and new patterns can coexist
- No pressure to complete quickly
- Each migrated service is immediate value

---

## Success Metrics

### Technical Metrics

| Metric           | Current | Target  | Measurement                      |
| ---------------- | ------- | ------- | -------------------------------- |
| Service coverage | 0%      | 100%    | All business logic in services   |
| Endpoint LOC     | ~50-100 | ~20-40  | Endpoints become thin            |
| Test speed       | Varies  | < 30s   | Transaction-based tests are fast |
| Test isolation   | ❌      | ✅      | All tests use transactions       |
| Mock usage       | High    | Minimal | Only external services mocked    |
| Test confidence  | Low     | High    | Testing real logic, not mocks    |

### Code Quality Metrics

- **Separation of concerns:** Clear layer boundaries
- **Testability:** All business logic easily testable
- **Maintainability:** Changes isolated to appropriate layer
- **Reusability:** Services usable beyond HTTP

### Process Metrics

- **Phase 1 completion:** 1 week
- **Each subsequent service:** 1-3 days
- **Total migration:** 6-8 weeks (no pressure)
- **Test coverage:** Maintain or increase

---

## Decision Points

### Question 1: Transaction Management Pattern

**Options:**

**A. Services accept connection, never start transactions**

- Routes start transaction, call service
- Tests use `withTestTransaction`, call service
- Simple, clear ownership

**B. Services optionally start transactions**

- If connection is transaction, use it
- If connection is db, start transaction
- More complex, error-prone

**Recommendation:** **Option A** - Simpler, clearer, less error-prone

---

### Question 2: Validation Location

**Options:**

**A. Keep validation in route handlers**

- Zod validation stays in routes
- Services receive typed, validated data
- Clear: routes handle HTTP concerns, services handle business

**B. Move validation to services**

- Services validate their inputs
- More reusable across different entry points
- But mixes HTTP validation with business validation

**Recommendation:** **Option A** - Keep in routes, services trust inputs

---

### Question 3: Error Handling Strategy

**Options:**

**A. Domain errors + translation layer** (proposed)

- Services throw domain errors
- Route handler translates to HTTP
- Clear separation

**B. Services throw HTTP errors directly**

- Less translation needed
- But couples services to HTTP

**Recommendation:** **Option A** - Domain errors, better abstraction

---

### Question 4: External Service Injection

**Options:**

**A. Pass as parameters**

- Services accept email sender, etc. as params
- More flexible, easier to test
- More verbose

**B. Services import directly**

- Simpler service signatures
- Harder to mock in tests
- Tighter coupling

**Recommendation:** **Option A** - Parameter injection for testability

---

### Question 5: Migration Pace

**Options:**

**A. Aggressive (2-3 weeks)**

- Full-time focus
- Faster completion
- Higher risk

**B. Steady (6-8 weeks)**

- One service every few days
- Time for learning and adjustment
- Lower risk

**C. Relaxed (no timeline)**

- Migrate as convenient
- No pressure
- Could drag on indefinitely

**Recommendation:** **Option B** - Steady pace, incremental progress

---

## Next Steps

### Immediate Actions (This Week)

1. **Review this plan** - Provide feedback, ask questions
2. **Make architectural decisions** - Answer questions above
3. **Approve approach** - Green light to proceed

### Phase 1 Kickoff (Week 1)

1. **Create infrastructure files:**
    - `server/lib/types.ts`
    - `server/lib/errors.ts`
    - `server/services/` directory

2. **Extract first service:**
    - `familyService.createFamily()`
    - Refactor route handler
    - Write service tests

3. **Validate pattern:**
    - Ensure types work
    - Verify tests pass
    - Confirm team understanding

4. **Document pattern:**
    - Update contributing guide
    - Add architecture documentation
    - Create service template

### Ongoing

- Migrate one service every 2-3 days
- Regular check-ins on progress
- Adjust as needed based on learnings
- Celebrate milestones

---

## Appendix: Reference Architecture

### Clean Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│                  (Framework-Specific)                       │
│  ┌────────────────────────────────────────────────────┐   │
│  │  HTTP Routes (H3 Event Handlers)                   │   │
│  │  - Parse requests                                   │   │
│  │  - Validate input (Zod)                            │   │
│  │  - Authenticate                                     │   │
│  │  - Call application layer                          │   │
│  │  - Format responses                                │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                         │
│                  (Framework-Agnostic)                       │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Services (Business Logic)                         │   │
│  │  - Authorization checks                            │   │
│  │  - Business rules                                  │   │
│  │  - Orchestrate operations                          │   │
│  │  - Domain error handling                           │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                      │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Database (Drizzle ORM)                            │   │
│  │  External Services (Email, etc.)                   │   │
│  │  File System                                       │   │
│  │  Third-party APIs                                  │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Benefits of This Architecture

1. **Independence:** Layers independent, can swap implementations
2. **Testability:** Business logic testable without framework
3. **Maintainability:** Changes localized to appropriate layer
4. **Flexibility:** Can add new entry points (GraphQL, CLI) easily
5. **Clarity:** Clear responsibilities per layer

---

## Conclusion

This service layer refactoring solves the Phase 2 testing blocker while significantly improving the codebase architecture. The incremental migration strategy ensures low risk and continuous progress. The result will be a more maintainable, testable, and professional codebase following industry best practices.

**Key Advantages:**

- ✅ Solves testing problem permanently
- ✅ Improves code organization
- ✅ Enables better testing across the board
- ✅ Follows best practices
- ✅ Incremental, low-risk migration
- ✅ No timeline pressure

**Ready to proceed?** Review this plan and provide feedback on the decision points above.
