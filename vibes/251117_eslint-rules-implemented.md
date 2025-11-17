---
title: "ESLint Rules Implementation: Service Layer Architecture Enforcement"
date: 2025-11-17
status: completed
related_documents:
    - vibes/251114_service-layer-refactoring-plan.md
    - vibes/251117_service-layer-refactoring-plan-review.md
tags:
    - eslint
    - architecture
    - tooling
---

# ESLint Rules Implementation

## Summary

Custom ESLint rules have been implemented to **automatically enforce** the service layer architecture patterns. These rules provide immediate feedback to developers and make architectural constraints self-enforcing.

## Implemented Rules

### 1. `custom-arch/no-global-db-in-services`

**Purpose:** Prevents importing the global `db` object within service files.

**Rationale:** Services must accept a `DbConnection` parameter (which can be either `db` or test transaction `tx`) to enable testing with `withTestTransaction()`.

**Error Message:**

```
Services must not import the global 'db' object. Accept a 'DbConnection' parameter instead.
```

**Example Violation:**

```typescript
// ❌ Bad - ESLint error
import { db } from "#server/db";

export async function createFamily(userId: string) {
    return await db.insert(families)...
}
```

**Correct Pattern:**

```typescript
// ✅ Good
import type { DbConnection } from "#server/lib/types";

export async function createFamily(
    dbConnection: DbConnection,
    userId: string
) {
    return await dbConnection.insert(families)...
}
```

---

### 2. `custom-arch/no-db-transaction-in-services`

**Purpose:** Prevents calling `.transaction()` from within service files.

**Rationale:** Transactions must be managed by the caller (route handler or test), never by services. This prevents nested transaction issues and maintains clear responsibility boundaries.

**Error Message:**

```
Services must not call .transaction(). Transactions should be managed by route handlers and passed as DbConnection parameters.
```

**Example Violation:**

```typescript
// ❌ Bad - ESLint error
export async function createFamily(dbConnection: DbConnection, userId: string) {
    await db.transaction(async (tx) => {
        // ESLint error!
        // ...
    });
}
```

**Correct Pattern:**

```typescript
// ✅ Good - Route handler manages transaction
export default defineEventHandler(async (event) => {
    // ... auth and validation

    const result = await db.transaction(async (tx) => {
        return await familyService.createFamily(tx, user.id, data);
    });

    return result;
});
```

---

### 3. `custom-arch/require-db-connection-param`

**Purpose:** Ensures exported async service functions accept a database connection parameter.

**Rationale:** Enforces the pattern that all service functions must accept `dbConnection` (or `db`, `tx`, `connection`) as their first parameter.

**Error Message:**

```
Service function 'functionName' must accept a 'dbConnection' or 'db' or 'tx' parameter as its first argument.
```

**Example Violation:**

```typescript
// ❌ Bad - ESLint error
export async function createFamily(userId: string, data: any) {
    // Missing dbConnection parameter!
}
```

**Correct Pattern:**

```typescript
// ✅ Good
export async function createFamily(
    dbConnection: DbConnection,
    userId: string,
    data: { name: string },
) {
    // ...
}
```

---

## Files Created

```
eslint-rules/
├── index.js                           # Plugin export
├── no-global-db-in-services.js        # Rule 1
├── no-db-transaction-in-services.js   # Rule 2
└── require-db-connection-param.js     # Rule 3
```

## Configuration

**Updated:** `eslint.config.mjs`

```javascript
import customRules from "./eslint-rules/index.js";

export default withNuxt([
    {
        ignores: [
            ".nuxt/**",
            "eslint.config.mjs",
            ".output/**",
            "eslint-rules/**", // Don't lint the lint rules themselves
        ],
    },
    // ... other config
    {
        plugins: {
            // ... other plugins
            "custom-arch": customRules,
        },
        rules: {
            // ... other rules
            "custom-arch/no-global-db-in-services": "error",
            "custom-arch/no-db-transaction-in-services": "error",
            "custom-arch/require-db-connection-param": "error",
        },
    },
]);
```

## Testing

The rules were tested and confirmed working:

```bash
$ pnpm run lint

/Users/henneuma/src/_asl/klankern/server/services/test-file.ts
   4:1   error  Services must not import the global 'db' object...          custom-arch/no-global-db-in-services
   7:8   error  Service function must accept a 'dbConnection' parameter...  custom-arch/require-db-connection-param
  13:11  error  Services must not call .transaction()...                    custom-arch/no-db-transaction-in-services
```

All three rules successfully caught violations!

## Benefits

1. **Automatic Enforcement:** Developers get immediate feedback in their editor/IDE
2. **CI/CD Integration:** Rules run as part of `pnpm run lint` in pre-commit hooks and CI
3. **Self-Documenting:** Error messages explain the correct pattern
4. **Prevents Mistakes:** Catches architectural violations before code review
5. **Learning Tool:** Helps developers understand the architecture

## How Rules Apply

- **Scope:** Only files in `server/services/` directory
- **Severity:** All rules are set to `error` (blocks commits/CI)
- **IDE Integration:** Works with ESLint IDE extensions (VS Code, etc.)

## Next Steps

As part of Phase 1 of the service layer refactoring:

- [x] Create custom ESLint rules
- [x] Test rules work correctly
- [x] Integrate into ESLint configuration
- [ ] Create `server/lib/types.ts` with `DbConnection` type
- [ ] Create `server/lib/errors.ts` with domain error classes
- [ ] Extract first service and apply patterns

## Maintenance

These rules use plain JavaScript (not TypeScript) and are kept in `eslint-rules/` directory. They are:

- Self-contained and independent
- Easy to modify if patterns change
- Excluded from being linted themselves (in `.gitignore` for ESLint)

## Impact

These rules are **foundational** for the success of the service layer architecture. They ensure:

- Consistent pattern adoption across the team
- No accidental violations slip through
- New developers learn the pattern through tooling
- Code reviews can focus on business logic, not architecture violations

---

**Status:** ✅ Completed and verified working
**Date:** 2025-11-17
