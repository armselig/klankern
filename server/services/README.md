# Service Layer

This directory contains the business logic layer of the Klankern application. Services are framework-agnostic functions that handle all business operations, authorization checks, and database interactions.

## Architecture Overview

The service layer architecture solves a critical testing problem: **transaction-based testing is incompatible with E2E server architecture**. By extracting business logic into services that accept database connections as parameters, we enable:

- **Transaction-based testing** without E2E complexity
- **Isolated, fast tests** that roll back automatically
- **Clean separation** between HTTP layer and business logic
- **Reusable logic** across different transport layers (HTTP, GraphQL, CLI, etc.)

## Core Principles

### 1. Accept Database Connection as Parameter

Services MUST accept a `DbConnection` as their first parameter. This can be either:

- Production: The global `db` object
- Test: A transaction object `tx` from `withTestTransaction()`

```typescript
export async function createFamily(
    dbConnection: DbConnection,
    userId: string,
    input: CreateFamilyInput,
) {
    // Use dbConnection for all database operations
    const [family] = await dbConnection
        .insert(families)
        .values({ name: input.name, creator_id: userId })
        .returning();

    return family;
}
```

### 2. Throw Domain Errors, Not HTTP Errors

Services throw domain-specific errors from `server/lib/errors.ts`:

- `UnauthorizedError` - User not authenticated
- `ForbiddenError` - User lacks permission
- `NotFoundError` - Resource not found
- `ValidationError` - Input validation failed
- `ConflictError` - Business rule violated
- `InternalError` - Unexpected error

Route handlers translate these to HTTP status codes.

```typescript
// ❌ BAD - Don't throw HTTP errors in services
throw createError({ statusCode: 401 });

// ✅ GOOD - Throw domain errors
throw new UnauthorizedError("User ID is required");
```

### 3. Framework-Agnostic

Services must NOT depend on:

- H3 event handlers
- HTTP request/response objects
- Session management
- Request context

All necessary data is passed as parameters.

### 4. No Transaction Management

Services MUST NOT call `db.transaction()`. Transactions are managed by:

- **Route handlers** in production
- **Test utilities** (`withTestTransaction()`) in tests

```typescript
// ❌ BAD - Don't manage transactions in services
export async function createFamily(dbConnection: DbConnection, ...) {
    await db.transaction(async (tx) => {
        // ESLint error!
    });
}

// ✅ GOOD - Transaction managed by caller
// Route handler:
const result = await db.transaction(async (tx) => {
    return await familyService.createFamily(tx, user.id, data);
});

// Test:
await withTestTransaction(async (tx) => {
    const family = await createFamily(tx, user.id, data);
    expect(family.name).toBe("Test Family");
});
```

## Architecture Enforcement

Custom ESLint rules automatically enforce these patterns:

- `custom-arch/no-global-db-in-services` - Prevents `import { db }` in services
- `custom-arch/no-db-transaction-in-services` - Prevents `db.transaction()` in services
- `custom-arch/require-db-connection-param` - Enforces dbConnection parameter

These rules apply ONLY to files in `server/services/` directory.

## Known Tech Debt

### Double admin check per request

Admin-only service functions (e.g. `deleteUser`, `deleteFamily`, `getAllUsersWithRoles`) re-check `isAdmin(dbConnection, userId)` even though the route handler already calls `requireAdmin(event)`. This results in two DB queries for the same privilege check on every admin request.

The redundancy exists because services must be framework-agnostic and cannot rely on the route handler having already verified permissions. Resolving this would require passing a pre-verified authorization context into services rather than re-querying. Tracked as a future architectural improvement.

## How Route Handlers Use Services

Route handlers remain thin and handle only:

1. Authentication (check `event.context.user`)
2. Input validation (Zod schemas)
3. Transaction management
4. Service calls
5. Error translation to HTTP responses

### Example: POST /api/families

```typescript
export default defineEventHandler(async (event) => {
    // 1. Authentication
    const user = event.context.user;
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }

    // 2. Input validation
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

    try {
        // 3. Transaction management + 4. Service call
        const newFamily = await db.transaction(async (tx) => {
            return await createFamily(tx, user.id, {
                name: parseResult.data.name,
            });
        });

        return newFamily;
    } catch (error) {
        logger.error(`Error creating family:`, error);

        // 5. Error translation
        if (error instanceof UnauthorizedError) {
            throw createError({
                statusCode: 401,
                statusMessage: error.message,
            });
        }
        if (error instanceof ValidationError) {
            throw createError({
                statusCode: 400,
                statusMessage: error.message,
                data: error.issues,
            });
        }
        // ... handle other domain errors
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
```

## How to Test Services

Services are tested using `withTestTransaction()` which provides automatic rollback:

```typescript
import { describe, expect, it } from "vitest";
import { withTestTransaction } from "#test/utils/db";
import { createTestUser } from "#test/utils/fixtures";
import { createFamily } from "#server/services/families";

describe("Families Service", () => {
    describe("createFamily", () => {
        it("should create a family with the creator as manager", async () => {
            await withTestTransaction(async (tx) => {
                // Arrange
                const user = await createTestUser(tx);
                const familyData = { name: "Test Family" };

                // Act
                const family = await createFamily(tx, user.id, familyData);

                // Assert
                expect(family).toBeDefined();
                expect(family.name).toBe("Test Family");
                expect(family.creator_id).toBe(user.id);

                // All changes automatically rolled back
            });
        });

        it("should throw UnauthorizedError when userId is missing", async () => {
            await withTestTransaction(async (tx) => {
                await expect(
                    createFamily(tx, "", { name: "Test" }),
                ).rejects.toThrow(UnauthorizedError);
            });
        });
    });
});
```

### Benefits of This Testing Approach

- **No E2E server** - Direct service calls
- **No HTTP mocking** - Test real business logic
- **No authentication mocking** - Pass user ID directly
- **Automatic cleanup** - Transaction rollback after each test
- **Fast execution** - No network overhead
- **Real database** - Tests use actual PostgreSQL
- **Isolated tests** - Each test in its own transaction

## Directory Structure

```
server/services/
├── README.md           # This file
├── auth.ts             # Email verification operations
├── families.ts         # Family management operations
├── invitations.ts      # Family invitation operations
├── roles.ts            # Role management operations
├── users.ts            # User management operations
└── ...                 # More services as needed
```

## Related Files

- `server/lib/types.ts` - `DbConnection` type definition
- `server/lib/errors.ts` - Domain error classes
- `test/utils/db.ts` - `withTestTransaction()` test utility
- `test/unit/services/` - Service tests
- `eslint-rules/` - Custom ESLint rules for architecture enforcement

## Migration Status

**Phase 2 Completed (2025-11-17)** - See `vibes/251117_phase2-completion-report.md` for details.

**Completed:**

- ✅ Infrastructure files (`server/lib/types.ts`, `server/lib/errors.ts`)
- ✅ ESLint rules for architecture enforcement
- ✅ Service modules: `families.ts`, `invitations.ts`, `roles.ts`, `users.ts`, `auth.ts`
- ✅ All API tests converted to service layer pattern
- ✅ Zero `registerEndpoint()` usage in test files
- ✅ 128 tests passing with transaction isolation
- ✅ Test execution time: ~8.25 seconds

**Service Functions:**

- `families.ts`: createFamily, transferOwnership
- `invitations.ts`: createInvitation
- `roles.ts`: getAllRoles, createRole
- `users.ts`: getAllUsersWithRoles, createUser
- `auth.ts`: sendVerificationEmail, verifyEmail

**Next Steps:**

Phase 3: Security & Edge Cases (authorization testing, input validation, concurrency, session management)

## Questions or Issues?

Refer to:

- **Detailed Plan:** `vibes/251114_service-layer-refactoring-plan.md`
- **ESLint Rules:** `vibes/251117_eslint-rules-implemented.md`
- **Original Issue:** GitHub issue #[number]
