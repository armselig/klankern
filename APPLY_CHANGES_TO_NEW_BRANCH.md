# Apply Schema Enhancements to feat/issue-18_db-security-audit-gdpr

This document provides the complete changes needed to apply all schema enhancements to the new branch.

## Status

I cannot directly access the `feat/issue-18_db-security-audit-gdpr` branch from this environment due to authentication limitations. However, I can provide all the necessary changes for you to apply.

## Files to Copy

The following files already exist on the current branch and need to be copied to the new branch:

1. **`shared/types/gdpr.ts`** - Already exists in the old PR
2. **`test/nuxt/db/schema-enhancements.spec.ts`** - Already exists in the old PR
3. **`.github/workflows/test.yml`** - Already exists in the old PR
4. **Documentation files in `vibes/`:**
   - `251106_db_data-retention-and-partitioning.md`
   - `251106_db_gdpr-compliance-guide.md`
   - `251106_db_schema-enhancements-summary.md`
   - `251106_db_security-summary.md`
   - `251107_db_code-review-response.md`
   - `251107_db_testing-guide.md`

## Schema Changes to Apply

The `server/db/schema.ts` file needs the following modifications:

### 1. Add Import for `integer` Type

At the top where other imports are, add `integer` to the `drizzle-orm/pg-core` imports:

```typescript
import {
    boolean,
    index,
    integer,  // ADD THIS
    jsonb,
    pgEnum,
    pgTable,
    primaryKey,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
```

### 2. Add PostgreSQL Enum Types

After the existing enums (`corkboardPostTypeEnum`, `invitationStatusEnum`, `familyRoleEnum`), add:

```typescript
// Audit logging enums
export const auditActionEnum = pgEnum("audit_action", [
    "create",
    "update",
    "delete",
    "login",
    "logout",
    "export",
    "anonymize",
]);

export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
    "user",
    "family",
    "corkboard_post",
    "invitation",
    "session",
    "consent",
]);
```

### 3. Enhance Users Table

Add these fields to the `users` table definition (after `dashboard_config` and before `created_at`):

```typescript
        // Failed login tracking (Issue #14)
        // Application logic should:
        // - Increment failed_login_attempts on failed login
        // - Set locked_until = now() + interval after N failed attempts
        // - Reset failed_login_attempts to 0 on successful login
        // - Check locked_until before allowing login
        // NOTE: Consider adding CHECK (failed_login_attempts >= 0)
        failed_login_attempts: integer("failed_login_attempts").default(0),
        last_failed_login_at: timestamp("last_failed_login_at"),
        locked_until: timestamp("locked_until"),
        // GDPR compliance (Issue #18)
        // When user requests account deletion, set anonymized_at instead of deleting
        // Application logic should anonymize: email, username, first_name, last_name, display_name
        anonymized_at: timestamp("anonymized_at"),
```

### 4. Enhance Sessions Table

Add these fields to the `sessions` table definition (after `expires_at` and before `created_at`):

```typescript
        // Session metadata for security monitoring (Issue #13)
        ip_address: text("ip_address"),
        user_agent: text("user_agent"),
        last_activity_at: timestamp("last_activity_at"),
        device_fingerprint: text("device_fingerprint"),
```

### 5. Add Audit Log Table

After the `familyInvitations` table definition, add:

```typescript
// Audit logging table (Issue #15)
export const auditLog = pgTable(
    "audit_log",
    {
        id: uuid("id")
            .primaryKey()
            .default(sql`uuidv7()`),
        user_id: uuid("user_id").references(() => users.id, {
            onDelete: "set null",
        }),
        action: auditActionEnum("action").notNull(),
        entity_type: auditEntityTypeEnum("entity_type").notNull(),
        entity_id: uuid("entity_id").notNull(),
        old_values: jsonb("old_values"),
        new_values: jsonb("new_values"),
        ip_address: text("ip_address"),
        user_agent: text("user_agent"),
        created_at: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => {
        return {
            userIdIndex: index("audit_log_user_id_idx").on(table.user_id),
            entityTypeIndex: index("audit_log_entity_type_idx").on(
                table.entity_type,
            ),
            entityIdIndex: index("audit_log_entity_id_idx").on(table.entity_id),
            createdAtIndex: index("audit_log_created_at_idx").on(
                table.created_at,
            ),
            // Composite index for querying specific entity's audit trail
            entityAuditIndex: index("audit_log_entity_audit_idx")
                .on(table.entity_type, table.entity_id, table.created_at)
                .concurrently(),
        };
    },
);

// User consents table (Issue #18 - GDPR)
export const userConsents = pgTable(
    "user_consents",
    {
        id: uuid("id")
            .primaryKey()
            .default(sql`uuidv7()`),
        user_id: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        consent_type: text("consent_type").notNull(), // 'marketing', 'analytics', etc.
        granted: boolean("granted").notNull(),
        granted_at: timestamp("granted_at").notNull().defaultNow(),
        revoked_at: timestamp("revoked_at"),
    },
    (table) => {
        return {
            userIdIndex: index("user_consents_user_id_idx").on(table.user_id),
            consentTypeIndex: index("user_consents_consent_type_idx").on(
                table.consent_type,
            ),
            // Composite index for checking current consent status
            userConsentStatusIndex: index("user_consents_user_status_idx")
                .on(table.user_id, table.consent_type, table.granted)
                .concurrently(),
        };
    },
);
```

### 6. Add Relations

Update the `usersRelations` to include the new tables. Replace the existing `usersRelations` with:

```typescript
export const usersRelations = relations(users, ({ many }) => ({
    userRoles: many(userRoles),
    sessions: many(sessions),
    corkboardPosts: many(corkboardPosts),
    familyMembers: many(familyMembers),
    createdFamilies: many(families, { relationName: "creator" }),
    sentFamilyInvitations: many(familyInvitations, {
        relationName: "inviter",
    }),
    auditLogs: many(auditLog),
    consents: many(userConsents),
}));
```

Add these new relation definitions after the existing relations:

```typescript
export const auditLogRelations = relations(auditLog, ({ one }) => ({
    user: one(users, {
        fields: [auditLog.user_id],
        references: [users.id],
    }),
}));

export const userConsentsRelations = relations(userConsents, ({ one }) => ({
    user: one(users, {
        fields: [userConsents.user_id],
        references: [users.id],
    }),
}));
```

## Steps to Apply

1. **Checkout the new branch:**
   ```bash
   git checkout feat/issue-18_db-security-audit-gdpr
   ```

2. **Apply schema changes to `server/db/schema.ts`** following the instructions above

3. **Copy files from old branch:**
   ```bash
   # Checkout files from old PR branch
   git checkout copilot/future-enhancements-db-schema -- shared/types/gdpr.ts
   git checkout copilot/future-enhancements-db-schema -- test/nuxt/db/schema-enhancements.spec.ts
   git checkout copilot/future-enhancements-db-schema -- .github/workflows/test.yml
   git checkout copilot/future-enhancements-db-schema -- vibes/251106_db_data-retention-and-partitioning.md
   git checkout copilot/future-enhancements-db-schema -- vibes/251106_db_gdpr-compliance-guide.md
   git checkout copilot/future-enhancements-db-schema -- vibes/251106_db_schema-enhancements-summary.md
   git checkout copilot/future-enhancements-db-schema -- vibes/251106_db_security-summary.md
   git checkout copilot/future-enhancements-db-schema -- vibes/251107_db_code-review-response.md
   git checkout copilot/future-enhancements-db-schema -- vibes/251107_db_testing-guide.md
   ```

4. **Generate migration:**
   ```bash
   pnpm run db:generate
   ```
   This will create migration `0009_*.sql` with all the changes

5. **Verify changes:**
   ```bash
   pnpm run lint
   pnpm run typecheck
   ```

6. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat(db): add schema enhancements for security, audit, and gdpr compliance

- Add PostgreSQL enum types for audit logging (audit_action, audit_entity_type)
- Enhance users table with failed login tracking and GDPR fields
- Enhance sessions table with metadata tracking for security monitoring
- Add audit_log table for comprehensive change tracking
- Add user_consents table for GDPR consent management
- Add comprehensive documentation and testing guide
- Add CI/CD workflow for automated testing

Fixes #13, #14, #15, #18"
   git push origin feat/issue-18_db-security-audit-gdpr
   ```

7. **Create Pull Request** targeting `develop` branch

## Alternative: Automated Application

If you prefer, I can create a script that applies all these changes automatically. Let me know!
