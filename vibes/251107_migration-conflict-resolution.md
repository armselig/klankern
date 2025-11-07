# Migration Conflict Resolution - PR #19

## Issue

This PR was created from an older version of `develop` and attempted to add migration `0006_noisy_talon.sql`. However, the `develop` branch has since progressed and now includes migrations up to `0008_acoustic_lady_mastermind.sql`, causing a conflict.

## Resolution Required

This PR should be closed and recreated from the current `develop` branch with the migration properly numbered as `0009` or later.

## Changes in This PR (To Be Reapplied)

### Schema Changes (`server/db/schema.ts`)

1. **Add PostgreSQL Enum Types:**
   ```typescript
   export const auditActionEnum = pgEnum("audit_action", [
       "create", "update", "delete", "login", "logout", "export", "anonymize"
   ]);
   
   export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
       "user", "family", "corkboard_post", "invitation", "session", "consent"
   ]);
   ```

2. **Enhance Users Table:**
   ```typescript
   // Failed login tracking fields
   failed_login_attempts: integer("failed_login_attempts").default(0),
   last_failed_login_at: timestamp("last_failed_login_at"),
   locked_until: timestamp("locked_until"),
   // GDPR compliance field
   anonymized_at: timestamp("anonymized_at"),
   ```

3. **Enhance Sessions Table:**
   ```typescript
   // Session metadata tracking fields
   ip_address: text("ip_address"),
   user_agent: text("user_agent"),
   last_activity_at: timestamp("last_activity_at"),
   device_fingerprint: text("device_fingerprint"),
   ```

4. **Add Audit Log Table:**
   ```typescript
   export const auditLog = pgTable("audit_log", {
       id: uuid("id").primaryKey().default(sql`uuidv7()`),
       user_id: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
       action: auditActionEnum("action").notNull(),
       entity_type: auditEntityTypeEnum("entity_type").notNull(),
       entity_id: uuid("entity_id").notNull(),
       old_values: jsonb("old_values"),
       new_values: jsonb("new_values"),
       ip_address: text("ip_address"),
       user_agent: text("user_agent"),
       created_at: timestamp("created_at").notNull().defaultNow(),
   });
   ```

5. **Add User Consents Table:**
   ```typescript
   export const userConsents = pgTable("user_consents", {
       id: uuid("id").primaryKey().default(sql`uuidv7()`),
       user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
       consent_type: text("consent_type").notNull(),
       granted: boolean("granted").notNull(),
       granted_at: timestamp("granted_at").notNull().defaultNow(),
       revoked_at: timestamp("revoked_at"),
   });
   ```

6. **Add Relations:**
   ```typescript
   // In usersRelations
   auditLogs: many(auditLog),
   consents: many(userConsents),
   ```

### New Files

1. **CI/CD Workflow:** `.github/workflows/test.yml`
2. **Types:** `shared/types/gdpr.ts`
3. **Tests:** `test/nuxt/db/schema-enhancements.spec.ts`
4. **Documentation:**
   - `vibes/251106_db_data-retention-and-partitioning.md`
   - `vibes/251106_db_gdpr-compliance-guide.md`
   - `vibes/251106_db_schema-enhancements-summary.md`
   - `vibes/251106_db_security-summary.md`
   - `vibes/251107_db_code-review-response.md`
   - `vibes/251107_db_testing-guide.md`

## Steps to Recreate PR

1. **Checkout develop branch:**
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Create new branch:**
   ```bash
   git checkout -b copilot/db-schema-enhancements-v2
   ```

3. **Apply schema changes to `server/db/schema.ts`** (see above)

4. **Copy all new files** from this PR

5. **Generate new migration:**
   ```bash
   pnpm run db:generate
   ```
   This will create migration `0009_*.sql` with all the changes

6. **Update test references** in `test/nuxt/db/schema-enhancements.spec.ts` if needed

7. **Verify changes:**
   ```bash
   pnpm run lint
   pnpm run typecheck
   ```

8. **Create new PR** targeting `develop` branch

## Status

- ✅ All code review feedback addressed in this PR
- ✅ PostgreSQL enum types implemented
- ✅ CI/CD workflow created
- ✅ Comprehensive documentation (6 guides)
- ✅ 25 tests created
- ❌ Migration number conflicts with develop
- 🔄 **Action Required:** Close this PR and recreate from current develop

## Notes

All the work in this PR is valuable and should be preserved. The only issue is the migration numbering conflict due to develop branch progressing independently. A simple recreation from current develop will resolve this.
