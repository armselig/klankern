# Database Schema Fix Plan - 2025-11-06

## Executive Summary

This document provides a detailed implementation plan to address the 34 issues identified in the database schema review. The plan prioritizes high-impact fixes that address security, data integrity, and maintainability concerns.

**Migration Approach:** Incremental migrations with zero-downtime where possible, using backward-compatible changes and careful rollout strategy.

**Target Timeline:**

- High Priority: 2-3 weeks
- Medium Priority: 4-6 weeks
- Low Priority: As needed

---

## 🎯 High Priority Fixes

### Fix #1: Standardize Naming Convention

**Issue:** Inconsistent use of camelCase and snake_case throughout schema
**Priority:** 🔴 Critical (affects all future development)
**Effort:** High (requires comprehensive migration)
**Risk:** High (breaking change for all queries)

#### Implementation Strategy

**Decision:** Adopt **snake_case** for all database columns (PostgreSQL convention)

**Affected Fields:**

- `users.createdAt` → `users.created_at`
- `users.updatedAt` → `users.updated_at`
- `users.dashboardConfig` → `users.dashboard_config`
- `sessions.userId` → `sessions.user_id`
- `sessions.expiresAt` → `sessions.expires_at`
- `sessions.createdAt` → `sessions.created_at`
- `corkboardPosts.userId` → `corkboard_posts.user_id`
- `corkboardPosts.createdAt` → `corkboard_posts.created_at`
- `corkboardPosts.updatedAt` → `corkboard_posts.updated_at`

#### Migration Steps

**Phase 1: Add New Columns (Backward Compatible)**

```sql
-- Add snake_case columns alongside existing ones
ALTER TABLE users
  ADD COLUMN created_at TIMESTAMP DEFAULT now(),
  ADD COLUMN updated_at TIMESTAMP DEFAULT now(),
  ADD COLUMN dashboard_config JSONB;

-- Copy data from old columns
UPDATE users SET
  created_at = "createdAt",
  updated_at = "updatedAt",
  dashboard_config = "dashboardConfig";

-- Make new columns NOT NULL after data migration
ALTER TABLE users
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;
```

**Phase 2: Update Application Code**

- Update all TypeScript/Drizzle schema definitions
- Update all API endpoints to use new column names
- Update all components that reference these fields
- Run full test suite

**Phase 3: Drop Old Columns**

```sql
-- After confirming app works with new columns
ALTER TABLE users
  DROP COLUMN "createdAt",
  DROP COLUMN "updatedAt",
  DROP COLUMN "dashboardConfig";
```

**Rollback Strategy:**

- Keep old columns until 100% confident in new implementation
- Can revert application code without data loss
- Full database backup before dropping columns

#### Files to Update

- `server/db/schema.ts` - All table definitions
- All API endpoints in `server/api/**/*.ts`
- All components referencing these fields
- All test files

**Estimated Effort:** 3-5 days

---

### Fix #2: Add Enums for Status and Role Fields

**Issue:** Text fields used for status/roles allow invalid values
**Priority:** 🔴 Critical (data integrity)
**Effort:** Medium
**Risk:** Medium (requires data validation before migration)

#### Implementation Plan

**Step 1: Create Enums in Schema**

```typescript
// Add to server/db/schema.ts after existing enums

export const invitationStatusEnum = pgEnum("invitation_status", [
    "pending",
    "accepted",
    "declined",
    "expired",
    "cancelled",
]);

export const familyRoleEnum = pgEnum("family_role", [
    "manager",
    "member",
    "viewer",
]);
```

**Step 2: Validate Existing Data**

```sql
-- Check for invalid invitation statuses
SELECT DISTINCT status FROM family_invitations;
-- Expected: 'pending', 'accepted', 'declined'
-- Fix any unexpected values

-- Check for invalid family roles
SELECT DISTINCT role FROM family_members;
-- Expected: 'manager', 'member'
-- Fix any unexpected values
```

**Step 3: Create Migration**

```sql
-- Create enum types
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled');
CREATE TYPE family_role AS ENUM ('manager', 'member', 'viewer');

-- Alter tables to use enums
ALTER TABLE family_invitations
  ALTER COLUMN status TYPE invitation_status USING status::invitation_status;

ALTER TABLE family_members
  ALTER COLUMN role TYPE family_role USING role::family_role;
```

**Step 4: Update Schema Definition**

```typescript
// In server/db/schema.ts

export const familyInvitations = pgTable("family_invitations", {
    // ...
    status: invitationStatusEnum("status").notNull().default("pending"),
    // ...
});

export const familyMembers = pgTable("family_members", {
    // ...
    role: familyRoleEnum("role").notNull().default("member"),
    // ...
});
```

**Rollback Strategy:**

```sql
-- Revert to text type
ALTER TABLE family_invitations
  ALTER COLUMN status TYPE text USING status::text;

ALTER TABLE family_members
  ALTER COLUMN role TYPE text USING role::text;

-- Drop enum types
DROP TYPE invitation_status;
DROP TYPE family_role;
```

**Estimated Effort:** 1 day

---

### Fix #3: Implement updatedAt Triggers

**Issue:** updatedAt fields don't automatically update on row changes
**Priority:** 🔴 Critical (data accuracy)
**Effort:** Low
**Risk:** Low

#### Implementation Plan

**Step 1: Create Trigger Function**

```sql
-- Create reusable trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

**Step 2: Attach Triggers to Tables**

```sql
-- Users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Families table
CREATE TRIGGER update_families_updated_at
    BEFORE UPDATE ON families
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Family invitations table
CREATE TRIGGER update_family_invitations_updated_at
    BEFORE UPDATE ON family_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Corkboard posts table
CREATE TRIGGER update_corkboard_posts_updated_at
    BEFORE UPDATE ON corkboard_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Step 3: Test Triggers**

```sql
-- Test update trigger
UPDATE users SET first_name = 'Test' WHERE id = 'some-uuid';
SELECT updated_at FROM users WHERE id = 'some-uuid';
-- Should show current timestamp
```

**Drizzle Migration File:**

```typescript
// migrations/0001_add_updated_at_triggers.ts
import { sql } from "drizzle-orm";

export async function up(db) {
    await db.execute(sql`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    `);

    await db.execute(sql`
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    `);

    // Add triggers for other tables...
}

export async function down(db) {
    await db.execute(
        sql`DROP TRIGGER IF EXISTS update_users_updated_at ON users;`,
    );
    // Drop other triggers...
    await db.execute(sql`DROP FUNCTION IF EXISTS update_updated_at_column();`);
}
```

**Rollback Strategy:**

```sql
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_families_updated_at ON families;
DROP TRIGGER IF EXISTS update_family_invitations_updated_at ON family_invitations;
DROP TRIGGER IF EXISTS update_corkboard_posts_updated_at ON corkboard_posts;
DROP FUNCTION IF EXISTS update_updated_at_column();
```

**Estimated Effort:** 2-4 hours

---

### Fix #4: Add Composite Indexes

**Issue:** Missing composite indexes for common query patterns
**Priority:** 🔴 High (performance)
**Effort:** Low
**Risk:** Low (additive change)

#### Indexes to Add

**Index 1: Active Sessions Per User**

```typescript
// In server/db/schema.ts sessions table
export const sessions = pgTable(
    "sessions",
    {
        // ... existing fields
    },
    (table) => {
        return {
            userIdIndex: index("sessions_user_id_idx").on(table.userId),
            tokenIndex: index("sessions_token_idx").on(table.token),
            expiresAtIndex: index("sessions_expires_at_idx").on(
                table.expiresAt,
            ),
            // NEW: Composite index for active user sessions
            userActiveSessionsIndex: index("sessions_user_active_idx").on(
                table.userId,
                table.expiresAt,
            ),
        };
    },
);
```

**Migration SQL:**

```sql
CREATE INDEX CONCURRENTLY sessions_user_active_idx
    ON sessions(user_id, expires_at);
```

**Index 2: Family Timeline Queries**

```typescript
// In corkboardPosts table
familyTimelineIndex: index("corkboard_posts_family_timeline_idx")
    .on(table.family_id, table.createdAt),
```

**Migration SQL:**

```sql
CREATE INDEX CONCURRENTLY corkboard_posts_family_timeline_idx
    ON corkboard_posts(family_id, created_at DESC);
```

**Index 3: Pending Family Invitations**

```typescript
// In familyInvitations table
familyStatusIndex: index("family_invitations_family_status_idx")
    .on(table.family_id, table.status),
```

**Migration SQL:**

```sql
CREATE INDEX CONCURRENTLY family_invitations_family_status_idx
    ON family_invitations(family_id, status);
```

**Note:** Use `CREATE INDEX CONCURRENTLY` to avoid locking tables during index creation.

**Drizzle Migration:**

```typescript
import { sql } from "drizzle-orm";

export async function up(db) {
    await db.execute(sql`
        CREATE INDEX CONCURRENTLY sessions_user_active_idx
            ON sessions(user_id, expires_at);
    `);

    await db.execute(sql`
        CREATE INDEX CONCURRENTLY corkboard_posts_family_timeline_idx
            ON corkboard_posts(family_id, created_at DESC);
    `);

    await db.execute(sql`
        CREATE INDEX CONCURRENTLY family_invitations_family_status_idx
            ON family_invitations(family_id, status);
    `);
}

export async function down(db) {
    await db.execute(sql`DROP INDEX IF EXISTS sessions_user_active_idx;`);
    await db.execute(
        sql`DROP INDEX IF EXISTS corkboard_posts_family_timeline_idx;`,
    );
    await db.execute(
        sql`DROP INDEX IF EXISTS family_invitations_family_status_idx;`,
    );
}
```

**Estimated Effort:** 2-3 hours

---

### Fix #5: Add Length Constraints

**Issue:** Unbounded text fields can be abused
**Priority:** 🔴 High (security/data integrity)
**Effort:** Low
**Risk:** Medium (may affect existing data)

#### Constraints to Add

**Step 1: Audit Existing Data**

```sql
-- Check max lengths in production
SELECT
    MAX(LENGTH(username)) as max_username,
    MAX(LENGTH(display_name)) as max_display_name,
    MAX(LENGTH(email)) as max_email,
    MAX(LENGTH(first_name)) as max_first_name,
    MAX(LENGTH(last_name)) as max_last_name
FROM users;

SELECT MAX(LENGTH(name)) as max_family_name
FROM families;
```

**Step 2: Define Reasonable Limits**

```typescript
// Proposed limits
const FIELD_LIMITS = {
    username: 50,
    email: 255,
    display_name: 100,
    first_name: 100,
    last_name: 100,
    family_name: 100,
    role_name: 50,
    role_description: 500,
};
```

**Step 3: Update Schema**

Option A: Use VARCHAR (database-enforced)

```typescript
export const users = pgTable("users", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuidv7()`),
    email: varchar("email", { length: 255 }).notNull().unique(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    display_name: varchar("display_name", { length: 100 }),
    first_name: varchar("first_name", { length: 100 }),
    last_name: varchar("last_name", { length: 100 }),
    // ...
});
```

Option B: Use TEXT with CHECK constraints

```sql
ALTER TABLE users
  ADD CONSTRAINT users_username_length CHECK (LENGTH(username) <= 50),
  ADD CONSTRAINT users_email_length CHECK (LENGTH(email) <= 255),
  ADD CONSTRAINT users_display_name_length CHECK (LENGTH(display_name) <= 100);
```

**Step 4: Migrate Existing Data**

```sql
-- Check for violations before migration
SELECT id, username, LENGTH(username)
FROM users
WHERE LENGTH(username) > 50;

-- Truncate if necessary (with user notification)
UPDATE users
SET username = SUBSTRING(username, 1, 50)
WHERE LENGTH(username) > 50;
```

**Recommendation:** Use VARCHAR for better performance and clearer intent.

**Drizzle Migration:**

```typescript
import { sql } from "drizzle-orm";

export async function up(db) {
    // Add constraints
    await db.execute(sql`
        ALTER TABLE users
            ADD CONSTRAINT users_username_length CHECK (LENGTH(username) <= 50),
            ADD CONSTRAINT users_email_length CHECK (LENGTH(email) <= 255),
            ADD CONSTRAINT users_display_name_length CHECK (LENGTH(display_name) <= 100),
            ADD CONSTRAINT users_first_name_length CHECK (LENGTH(first_name) <= 100),
            ADD CONSTRAINT users_last_name_length CHECK (LENGTH(last_name) <= 100);
    `);

    await db.execute(sql`
        ALTER TABLE families
            ADD CONSTRAINT families_name_length CHECK (LENGTH(name) <= 100);
    `);

    await db.execute(sql`
        ALTER TABLE roles
            ADD CONSTRAINT roles_name_length CHECK (LENGTH(name) <= 50),
            ADD CONSTRAINT roles_description_length CHECK (LENGTH(description) <= 500);
    `);
}

export async function down(db) {
    await db.execute(sql`
        ALTER TABLE users
            DROP CONSTRAINT IF EXISTS users_username_length,
            DROP CONSTRAINT IF EXISTS users_email_length,
            DROP CONSTRAINT IF EXISTS users_display_name_length,
            DROP CONSTRAINT IF EXISTS users_first_name_length,
            DROP CONSTRAINT IF EXISTS users_last_name_length;
    `);

    await db.execute(sql`
        ALTER TABLE families DROP CONSTRAINT IF EXISTS families_name_length;
    `);

    await db.execute(sql`
        ALTER TABLE roles
            DROP CONSTRAINT IF EXISTS roles_name_length,
            DROP CONSTRAINT IF EXISTS roles_description_length;
    `);
}
```

**Estimated Effort:** 3-4 hours

---

### Fix #6: Fix Soft Delete Handling

**Issue:** Incomplete soft delete implementation for families
**Priority:** 🔴 High (data integrity/security)
**Effort:** Medium
**Risk:** Medium (requires careful query updates)

#### Implementation Strategy

**Option A: Cascade Soft Deletes**
Add `deleted_at` to related tables and implement application-level cascade.

**Option B: Create Database View**
Create view that filters out soft-deleted families automatically.

**Option C: Use Database Triggers**
Automatically set `deleted_at` on related records when family is soft-deleted.

**Recommended Approach: Option A + Database Triggers**

#### Phase 1: Add deleted_at to Related Tables

```typescript
// Update schema.ts

export const familyMembers = pgTable("family_members", {
    family_id: uuid("family_id")
        .notNull()
        .references(() => families.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    role: familyRoleEnum("role").notNull().default("member"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"), // NEW
});

export const familyInvitations = pgTable("family_invitations", {
    // ... existing fields
    deleted_at: timestamp("deleted_at"), // NEW
});

export const corkboardPosts = pgTable("corkboard_posts", {
    // ... existing fields
    deleted_at: timestamp("deleted_at"), // NEW
});
```

**Migration:**

```sql
ALTER TABLE family_members ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE family_invitations ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE corkboard_posts ADD COLUMN deleted_at TIMESTAMP;

-- Add indexes for soft delete queries
CREATE INDEX family_members_deleted_at_idx ON family_members(deleted_at);
CREATE INDEX family_invitations_deleted_at_idx ON family_invitations(deleted_at);
CREATE INDEX corkboard_posts_deleted_at_idx ON corkboard_posts(deleted_at);
```

#### Phase 2: Create Cascade Trigger

```sql
-- Trigger function to cascade soft deletes
CREATE OR REPLACE FUNCTION soft_delete_family_cascade()
RETURNS TRIGGER AS $$
BEGIN
    -- Soft delete related family members
    UPDATE family_members
    SET deleted_at = NEW.deleted_at
    WHERE family_id = NEW.id AND deleted_at IS NULL;

    -- Soft delete related invitations
    UPDATE family_invitations
    SET deleted_at = NEW.deleted_at
    WHERE family_id = NEW.id AND deleted_at IS NULL;

    -- Soft delete related corkboard posts
    UPDATE corkboard_posts
    SET deleted_at = NEW.deleted_at
    WHERE family_id = NEW.id AND deleted_at IS NULL;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Attach trigger
CREATE TRIGGER cascade_family_soft_delete
    AFTER UPDATE OF deleted_at ON families
    FOR EACH ROW
    WHEN (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
    EXECUTE FUNCTION soft_delete_family_cascade();
```

#### Phase 3: Update Application Queries

Add `deleted_at IS NULL` filter to all queries:

```typescript
// Example: Fetch active family members
const members = await db
    .select()
    .from(familyMembers)
    .where(
        and(
            eq(familyMembers.family_id, familyId),
            isNull(familyMembers.deleted_at),
        ),
    );

// Example: Fetch family with active check
const family = await db
    .select()
    .from(families)
    .where(and(eq(families.id, familyId), isNull(families.deleted_at)));
```

#### Phase 4: Create Helper Functions

```typescript
// server/db/helpers.ts

/**
 * Adds soft delete filter to query condition
 */
export function notDeleted<T extends { deleted_at: any }>(table: T) {
    return isNull(table.deleted_at);
}

// Usage:
const members = await db
    .select()
    .from(familyMembers)
    .where(
        and(eq(familyMembers.family_id, familyId), notDeleted(familyMembers)),
    );
```

#### Phase 5: Create Restore Function

```typescript
/**
 * Restores a soft-deleted family and all related records
 */
export async function restoreFamily(familyId: string) {
    await db.transaction(async (tx) => {
        // Restore family
        await tx
            .update(families)
            .set({ deleted_at: null })
            .where(eq(families.id, familyId));

        // Restore related records
        await tx
            .update(familyMembers)
            .set({ deleted_at: null })
            .where(eq(familyMembers.family_id, familyId));

        await tx
            .update(familyInvitations)
            .set({ deleted_at: null })
            .where(eq(familyInvitations.family_id, familyId));

        await tx
            .update(corkboardPosts)
            .set({ deleted_at: null })
            .where(eq(corkboardPosts.family_id, familyId));
    });
}
```

**Estimated Effort:** 2-3 days

---

## 🟡 Medium Priority Fixes

### Fix #7: Add Timestamps to Junction Tables

**Tables Affected:** `familyMembers`, `userRoles`

**Implementation:**

```typescript
export const familyMembers = pgTable("family_members", {
    family_id: uuid("family_id")
        .notNull()
        .references(() => families.id),
    user_id: uuid("user_id")
        .notNull()
        .references(() => users.id),
    role: familyRoleEnum("role").notNull().default("member"),
    created_at: timestamp("created_at").notNull().defaultNow(), // NEW
    updated_at: timestamp("updated_at")
        .notNull()
        .default(sql`now()`), // NEW
});
```

**Estimated Effort:** 2 hours

---

### Fix #8: Implement Family Ownership Transfer

**Strategy:** Add constraint and transfer function

```typescript
// Option 1: Restrict creator deletion
.references(() => users.id, { onDelete: "restrict" })

// Option 2: Add ownership transfer function
export async function transferFamilyOwnership(
    familyId: string,
    newOwnerId: string
) {
    await db
        .update(families)
        .set({ creator_id: newOwnerId, updated_at: sql`now()` })
        .where(eq(families.id, familyId));
}
```

**Estimated Effort:** 1 day

---

### Fix #9: Add GIN Indexes for JSONB

**Implementation:**

```sql
CREATE INDEX CONCURRENTLY users_dashboard_config_gin_idx
    ON users USING gin(dashboard_config);

CREATE INDEX CONCURRENTLY corkboard_posts_data_gin_idx
    ON corkboard_posts USING gin(data);
```

**Note:** Only implement if querying within JSONB fields.

**Estimated Effort:** 1 hour

---

### Fix #10: Add Partial Indexes

**Active Sessions:**

```sql
CREATE INDEX CONCURRENTLY sessions_active_idx
    ON sessions(expires_at)
    WHERE expires_at > now();
```

**Active Families:**

```sql
CREATE INDEX CONCURRENTLY families_active_idx
    ON families(created_at)
    WHERE deleted_at IS NULL;
```

**Pending Invitations:**

```sql
CREATE INDEX CONCURRENTLY family_invitations_pending_idx
    ON family_invitations(family_id, invited_email)
    WHERE status = 'pending';
```

**Estimated Effort:** 2 hours

---

### Fix #11: Add Unique Constraint for Invitations

**Implementation:**

```sql
-- Partial unique index: only one pending invitation per family/email
CREATE UNIQUE INDEX family_invitations_unique_pending
    ON family_invitations(family_id, invited_email)
    WHERE status = 'pending';
```

**Drizzle Schema:**

```typescript
(table) => {
    return {
        // ... other indexes
        uniquePendingInvitation: uniqueIndex(
            "family_invitations_unique_pending",
        )
            .on(table.family_id, table.invited_email)
            .where(sql`status = 'pending'`),
    };
};
```

**Estimated Effort:** 2 hours

---

### Fix #12: Add Email Verification Status

**Implementation:**

```typescript
export const users = pgTable("users", {
    // ... existing fields
    email_verified: boolean("email_verified").default(false), // NEW
    email_verified_at: timestamp("email_verified_at"), // NEW
    email_verification_token: text("email_verification_token").unique(), // NEW
});
```

**Migration:**

```sql
ALTER TABLE users
    ADD COLUMN email_verified BOOLEAN DEFAULT false,
    ADD COLUMN email_verified_at TIMESTAMP,
    ADD COLUMN email_verification_token TEXT UNIQUE;

-- Set existing users as verified (optional)
UPDATE users SET email_verified = true WHERE created_at < now();
```

**Estimated Effort:** 4 hours (including verification flow)

---

## 🟢 Low Priority Fixes

### Fix #13-18: Future Enhancements

These can be implemented as needed:

- Session metadata (IP, user agent)
- Failed login tracking
- Audit logging table
- Data retention policies
- Table partitioning
- GDPR features (anonymization, consent tracking)

**Estimated Effort:** 1-2 weeks total

---

## 📋 Migration Order & Dependencies

### Phase 1: Foundation (Week 1)

1. ✅ Add updatedAt triggers (no dependencies)
2. ✅ Add composite indexes (no dependencies)
3. ✅ Add length constraints (validate data first)

### Phase 2: Data Model Improvements (Week 2)

4. ✅ Add enums (requires data validation)
5. ✅ Add timestamps to junction tables
6. ✅ Add partial indexes

### Phase 3: Complex Changes (Week 3)

7. ✅ Fix naming convention (largest effort, coordinate with team)
8. ✅ Fix soft delete handling
9. ✅ Add unique constraints

### Phase 4: Feature Additions (Week 4+)

10. ✅ Email verification
11. ✅ Family ownership transfer
12. ✅ GIN indexes (if needed)

---

## 🧪 Testing Strategy

### For Each Migration

1. **Pre-Migration Testing**
    - Backup production database
    - Test migration on staging environment
    - Validate existing data compatibility
    - Performance test with production-like data volume

2. **Migration Testing**
    - Run migration on isolated database copy
    - Verify data integrity after migration
    - Test rollback procedure
    - Measure migration duration

3. **Post-Migration Testing**
    - Run full test suite
    - Manual QA of affected features
    - Monitor query performance
    - Check for N+1 queries

4. **Production Monitoring**
    - Monitor error rates
    - Track query performance
    - Watch database CPU/memory
    - Be ready to rollback

---

## 🚨 Rollback Procedures

### General Rollback Process

1. **Immediate Rollback (< 5 minutes after deployment)**
    - Revert application deployment
    - Run down migration
    - Restore from backup if necessary

2. **Delayed Rollback (> 5 minutes, data written)**
    - More complex, requires data analysis
    - May need custom migration to preserve new data
    - Consult backup and logs

### Per-Fix Rollback Commands

See individual sections above for specific rollback SQL.

---

## 📊 Risk Assessment

### High Risk Migrations

- **Naming convention fix (#1):** Touches all queries, coordinate carefully
- **Soft delete handling (#6):** Complex logic, test thoroughly

### Medium Risk Migrations

- **Enums (#2):** Requires data validation beforehand
- **Length constraints (#5):** May affect existing data

### Low Risk Migrations

- **Triggers (#3):** Additive, easily reverted
- **Indexes (#4, #10):** Additive, can be dropped easily
- **Timestamps on junction tables (#7):** Additive

---

## ✅ Pre-Migration Checklist

Before executing any migration:

- [ ] Full database backup completed
- [ ] Migration tested on staging environment
- [ ] Rollback procedure documented and tested
- [ ] Team notified of migration window
- [ ] Monitoring dashboards ready
- [ ] On-call engineer available
- [ ] Customer communication prepared (if downtime expected)
- [ ] Performance baseline captured
- [ ] Data validation queries prepared

---

## 📈 Success Metrics

Track these metrics before and after migrations:

**Performance:**

- Average query response time
- 95th/99th percentile query times
- Database CPU utilization
- Index hit ratio

**Data Quality:**

- No NULL values in NOT NULL columns
- No invalid enum values
- updatedAt reflects actual update times
- Soft deletes properly cascaded

**Application Health:**

- Error rate < 0.1%
- No increase in 500 errors
- All tests passing
- No customer complaints

---

## 📝 Notes

- Use `CREATE INDEX CONCURRENTLY` to avoid table locks
- Always validate data before adding constraints
- Keep old columns during transition period for safety
- Monitor query performance after index changes
- Consider maintenance windows for high-risk changes

---

**Document Version:** 1.0
**Last Updated:** 2025-11-06
**Owner:** Development Team
**Review Date:** After Phase 1 completion
