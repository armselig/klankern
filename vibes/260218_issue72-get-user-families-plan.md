# Plan: Complete issue #72 (Option B+C hybrid)

## Context

Issue #72 aimed to expand soft-delete test coverage from ~6 tests (families + invitations) to ~15
tests across all 5 service files. Investigation revealed that `users`, `roles`, and `userRoles` have
**no `deleted_at` column** — the issue's assumption was incorrect. The real security gap
(`is_active` not enforced in `isAdmin()` and `sendVerificationEmail()`) was fixed in commit
`7fa38278` with 5 new tests.

The only remaining item within the current schema is `getUserFamilies()` — a function referenced in
`families.spec.ts` placeholders that does not yet exist. The question of adding `deleted_at` to the
`users` table (to support true soft-delete for users) is deferred to a new design issue because it
requires a product decision: what distinguishes soft-deletion from deactivation (`is_active=false`)
and GDPR anonymisation (`anonymized_at`)? Three overlapping "disabled" states need defined
semantics before implementation.

---

## Step 1 — Implement `getUserFamilies()` in families service

**File:** `server/services/families.ts`

Add a new exported function. All required imports (`and`, `eq`, `families`, `familyMembers`,
`notDeleted`, `UnauthorizedError`) are already present in the file.

```ts
/**
 * Retrieves all active families a user is an active member of.
 *
 * Filters out families where deleted_at is set and families where the
 * user's membership record itself has been soft-deleted, preventing
 * access via stale membership after removal.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @param userId - ID of the user whose families to retrieve
 * @returns Array of active family records the user belongs to
 * @throws {UnauthorizedError} If userId is not provided
 */
export async function getUserFamilies(
    dbConnection: DbConnection,
    userId: string | null | undefined,
) {
    if (!userId) {
        throw new UnauthorizedError("User ID is required");
    }

    return dbConnection
        .select({
            id: families.id,
            name: families.name,
            creator_id: families.creator_id,
            created_at: families.created_at,
            updated_at: families.updated_at,
            deleted_at: families.deleted_at,
        })
        .from(families)
        .innerJoin(familyMembers, eq(familyMembers.family_id, families.id))
        .where(
            and(
                eq(familyMembers.user_id, userId),
                notDeleted(familyMembers),
                notDeleted(families),
            ),
        );
}
```

---

## Step 2 — Add tests to families.spec.ts

**File:** `test/nuxt/services/families.spec.ts`

Add `getUserFamilies` to the existing import from `#server/services/families`.

### In `describe("Empty Collections")` — replace the two empty placeholders:

1. `should return an empty array when a user has no families`
    - Create a user, call `getUserFamilies(tx, user.id)`, expect result to be `[]`

2. `should return families the user is a member of`
    - Create user + family via `createTestFamily`, expect array length ≥ 1 containing that family's id

### In `describe("Soft-Deleted Resources")` — append after the 3 existing tests:

3. `should exclude soft-deleted families from getUserFamilies`
    - Create user + family, set `families.deleted_at = new Date()`, call `getUserFamilies`,
      expect `[]`

4. `should exclude families where the user's membership is soft-deleted`
    - Create user + family, set `familyMembers.deleted_at = new Date()` for that user/family pair,
      call `getUserFamilies`, expect `[]`

### In `describe("Authorization")` — append:

5. `should throw UnauthorizedError when userId is not provided`
    - Call `getUserFamilies(tx, null)`, expect `UnauthorizedError`

### Fixtures already available (no new fixtures needed):

- `createTestUser(tx)` — `test/utils/fixtures.ts`
- `createTestFamily(tx, userId)` — `test/utils/fixtures.ts`
- `withTestTransaction` — `test/utils/db.ts`

---

## Step 3 — Open new GitHub issue

```bash
gh issue create \
  --title "design(schema): clarify user deactivation semantics before adding deleted_at" \
  --label "design,security" \
  --body "..."
```

Body content:

- `users` currently has `is_active` (boolean) + `anonymized_at` (GDPR) but no `deleted_at`
- Adding `deleted_at` would create three overlapping "disabled" states with no documented distinction
- Before implementing, define: what is the semantic difference between deactivated
  (`is_active=false`), soft-deleted (`deleted_at IS NOT NULL`), and anonymised
  (`anonymized_at IS NOT NULL`)?
- The `is_active` enforcement gap was closed in commit `7fa38278` (issue #72)
- Parent: #64

---

## Step 4 — Close issue #72

Post a closing comment on #72 summarising:

- What was fully implemented: families/invitations soft-delete (PR #71), `is_active` enforcement
  for admin + auth operations (commit `7fa38278`), `getUserFamilies` with soft-delete filters
- What was intentionally deferred: `deleted_at` on `users` (product decision needed, link new issue)
- `roles`/`userRoles` `deleted_at`: assessed as N/A — static reference table, not user-managed

Then close the issue.

---

## Verification

```bash
npx vitest run test/nuxt/services/families.spec.ts
npx vitest run test/nuxt/services/
```

All 5 new tests should pass. No existing tests should regress.

---

## Critical files

| File                                  | Change                                                              |
| ------------------------------------- | ------------------------------------------------------------------- |
| `server/services/families.ts`         | Add `getUserFamilies()` export                                      |
| `test/nuxt/services/families.spec.ts` | Add 5 tests, replace 2 empty placeholders, import `getUserFamilies` |
