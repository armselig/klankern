# Plan to Fix 23 Failing Tests

## Executive Summary

This document outlines a step-by-step plan to address and resolve 23 failing tests within the Klankern project. The root cause of these failures has been identified as missing timestamp fields (`created_at` and `updated_at`) in two critical junction tables: `userRoles` and `familyMembers`. These missing fields lead to issues during database migrations and schema validation, causing cascading test failures. The proposed solution involves modifying the database schema, generating and applying new migrations, and verifying the fixes through comprehensive testing.

**Estimated Time to Completion:** 40 minutes

## Detailed Step-by-Step Fix Plan

### Phase 1: Initial Assessment and Preparation (5 minutes)

1.  **Review Test Failures:** (Already completed) Confirmed 23 failing tests related to database schema and migrations.
2.  **Identify Root Cause:** (Already completed) Missing `created_at` and `updated_at` fields in `userRoles` and `familyMembers` tables.
3.  **Ensure Clean Git State:**
    - Verify no uncommitted changes to avoid conflicts.
    ```bash
    git status
    ```

    - If there are uncommitted changes, stash or commit them.
    ```bash
    git stash
    ```

### Phase 2: Modify Database Schema (10 minutes)

The goal is to add the missing `created_at` and `updated_at` fields to the `userRoles` and `familyMembers` tables in `server/db/schema.ts`.

1.  **Open `server/db/schema.ts`:**
    ```bash
    # Use your preferred editor, e.g.,
    # code server/db/schema.ts
    ```
2.  **Locate `userRoles` table definition:**
    - Add `createdAt` and `updatedAt` fields.
    - **Old Code (example - actual code might vary slightly):**
        ```typescript
        export const userRoles = pgTable(
            "user_roles",
            {
                userId: uuid("user_id")
                    .notNull()
                    .references(() => users.id, { onDelete: "cascade" }),
                roleId: uuid("role_id")
                    .notNull()
                    .references(() => roles.id, { onDelete: "cascade" }),
            },
            (t) => ({
                pk: primaryKey(t.userId, t.roleId),
            }),
        );
        ```
    - **New Code:**
        ```typescript
        export const userRoles = pgTable(
            "user_roles",
            {
                userId: uuid("user_id")
                    .notNull()
                    .references(() => users.id, { onDelete: "cascade" }),
                roleId: uuid("role_id")
                    .notNull()
                    .references(() => roles.id, { onDelete: "cascade" }),
                createdAt: timestamp("created_at", { withTimezone: true })
                    .notNull()
                    .defaultNow(),
                updatedAt: timestamp("updated_at", { withTimezone: true })
                    .notNull()
                    .defaultNow(),
            },
            (t) => ({
                pk: primaryKey(t.userId, t.roleId),
            }),
        );
        ```
3.  **Locate `familyMembers` table definition:**
    - Add `updatedAt` field (the `createdAt` field is already present).
    - **Old Code (example - actual code might vary slightly):**
        ```typescript
        export const familyMembers = pgTable(
            "family_members",
            {
                familyId: uuid("family_id")
                    .notNull()
                    .references(() => families.id, { onDelete: "cascade" }),
                userId: uuid("user_id")
                    .notNull()
                    .references(() => users.id, { onDelete: "cascade" }),
                role: varchar("role", { length: 256 })
                    .$type<FamilyMemberRole>()
                    .notNull()
                    .default("member"),
                createdAt: timestamp("created_at", { withTimezone: true })
                    .notNull()
                    .defaultNow(),
            },
            (t) => ({
                pk: primaryKey(t.familyId, t.userId),
            }),
        );
        ```
    - **New Code:**
        ```typescript
        export const familyMembers = pgTable(
            "family_members",
            {
                familyId: uuid("family_id")
                    .notNull()
                    .references(() => families.id, { onDelete: "cascade" }),
                userId: uuid("user_id")
                    .notNull()
                    .references(() => users.id, { onDelete: "cascade" }),
                role: varchar("role", { length: 256 })
                    .$type<FamilyMemberRole>()
                    .notNull()
                    .default("member"),
                createdAt: timestamp("created_at", { withTimezone: true })
                    .notNull()
                    .defaultNow(),
                updatedAt: timestamp("updated_at", { withTimezone: true })
                    .notNull()
                    .defaultNow(),
            },
            (t) => ({
                pk: primaryKey(t.familyId, t.userId),
            }),
        );
        ```
4.  **Save `server/db/schema.ts`**

### Phase 3: Generate New Migration (5 minutes)

1.  **Run Drizzle Kit Migration Generation:**
    - This command will compare the current schema with the database and generate a new migration file.
    - **For Containerized Development:**
        ```bash
        podman exec klankern_nuxt pnpm run db:generate
        ```
    - **For Local Development:**
        ```bash
        pnpm run db:generate
        ```
    - **Expected Output:** A new migration file will be created in `server/db/migrations/` with a name similar to `00XX_add_timestamps_to_junction_tables.sql`.
2.  **Review Generated Migration File:**
    - Open the newly created SQL file in `server/db/migrations/`.
    - Verify that it contains `ALTER TABLE` statements to add `created_at` and `updated_at` columns to `user_roles` and `updated_at` to `family_members`.
    - Ensure default values and `NOT NULL` constraints are correctly applied.

### Phase 4: Apply Migrations to Database (5 minutes)

1.  **Run Drizzle Kit Migrations:**
    - This command will apply all pending migrations to the database, including the newly generated one.
    - **For Containerized Development:**
        ```bash
        podman exec klankern_nuxt pnpm run db:migrate
        ```
    - **For Local Development:**
        ```bash
        pnpm run db:migrate
        ```
    - **Expected Output:** Confirmation that migrations have been applied successfully.

### Phase 5: Verify Fixes (10 minutes)

1.  **Run All Tests:**
    - Execute the test suite to confirm that all 23 previously failing tests now pass.
    - **For Containerized Development:**
        ```bash
        podman exec klankern_nuxt pnpm run test
        ```
    - **For Local Development:**
        ```bash
        pnpm run test
        ```
    - **Expected Output:** All tests should pass. If any tests still fail, proceed to the troubleshooting section.

### Phase 6: Clean Up and Commit (5 minutes)

1.  **Remove Temporary Log File:**
    ```bash
    rm ./251112_failing-tests.log
    ```
2.  **Add Changes to Git Staging Area:**
    ```bash
    git add server/db/schema.ts server/db/migrations/
    ```
3.  **Commit Changes:**
    - Use a conventional commit message.
    ```bash
    git commit -m "fix(db): add missing timestamps to user_roles and family_members tables" -m "This commit resolves 23 failing tests by adding 'created_at' and 'updated_at' fields to the 'user_roles' table and 'updated_at' to the 'family_members' table. These fields are essential for migration triggers and schema validation."
    ```

## Troubleshooting

- **Migration Generation Fails:**
    - **Issue:** Drizzle Kit might complain about existing data or conflicts.
    - **Mitigation:** Double-check `server/db/schema.ts` for typos. Ensure the database is clean if you're developing locally and can afford to reset it (e.g., `pnpm run db:reset` if available, or manually drop/recreate the database).
- **Migrations Fail to Apply:**
    - **Issue:** Database connection issues, or conflicts with existing data if the database is not clean.
    - **Mitigation:** Verify database container is running (`podman ps`). Check database logs for errors. Ensure the database user has appropriate permissions.
- **Tests Still Failing:**
    - **Issue:** The root cause might be more complex, or there are other underlying issues.
    - **Mitigation:**
        1.  Carefully re-examine the test output for new error messages.
        2.  Review the generated migration file and the `server/db/schema.ts` changes for any discrepancies.
        3.  Consider reverting changes and re-evaluating the problem if the issue persists.

## Success Criteria

- All 23 previously failing tests now pass.
- A new migration file is successfully generated and applied.
- The `userRoles` and `familyMembers` tables in the database schema include the correct timestamp fields.

## Rollback Plan

If any step fails or introduces new issues, the following rollback procedure can be followed:

1.  **Revert Schema Changes:**
    ```bash
    git restore server/db/schema.ts
    ```
2.  **Remove New Migration File:**
    ```bash
    rm server/db/migrations/00XX_add_timestamps_to_junction_tables.sql # Replace 00XX with the actual migration file name
    ```
3.  **Revert Database to Previous State:** This might require restoring a database backup or, in a development environment, dropping and recreating the database and reapplying previous migrations.
    - **For Containerized Development (if `db:reset` is available and safe):**
        ```bash
        podman exec klankern_nuxt pnpm run db:reset
        ```
    - **Manual Database Reset (if applicable and safe for development):**
        - Stop database container.
        - Remove database volume/data.
        - Start database container.
        - Run previous migrations.

## Technical Context

The `created_at` and `updated_at` timestamp fields are crucial for several reasons:

- **Auditability:** They provide a historical record of when a record was created or last modified, which is essential for debugging, compliance, and understanding data evolution.
- **Trigger Functionality:** The database often uses triggers (e.g., `0006_add_updated_at_triggers.sql`) to automatically update the `updated_at` field on record changes. If these fields are missing, the triggers will fail, leading to database errors.
- **Schema Validation:** Drizzle Kit and other ORMs perform schema validation. Missing expected fields will cause mismatches and errors during migration generation and application.
- **Soft Deletion/GDPR Compliance:** While not directly related to this fix, these timestamps are fundamental for implementing features like soft deletion or tracking data for GDPR compliance, where the age and modification history of data are important.
