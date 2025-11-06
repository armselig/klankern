# Database Schema Review - 2025-11-06

## Executive Summary

This document contains a comprehensive review of `server/db/schema.ts` examining security, design patterns, edge cases, and performance optimizations. The schema is generally well-structured with proper use of UUID v7, foreign keys, and basic indexing. However, there are several areas requiring attention ranging from critical security concerns to performance optimizations.

**Overall Assessment:** 🟡 Good foundation with important improvements needed

---

## 🔐 Security Concerns

### Critical Issues

#### 1. Session Tokens Stored in Plain Text

**Location:** `sessions.token` (line 95)
**Issue:** Tokens are stored as plain text in the database
**Risk:** If database is compromised, all active session tokens are exposed
**Recommendation:** Hash tokens before storage (similar to password hashing)

#### 2. No Session Metadata for Security Auditing

**Location:** `sessions` table (lines 86-108)
**Issue:** Missing IP address, user agent, device fingerprint
**Risk:** Cannot detect suspicious activity, session hijacking, or unauthorized access patterns
**Recommendation:** Add fields:

```typescript
ipAddress: text("ip_address"),
userAgent: text("user_agent"),
lastActivityAt: timestamp("last_activity_at"),
```

#### 3. No Failed Login Attempt Tracking

**Location:** `users` table (lines 38-65)
**Issue:** No mechanism to track or limit failed login attempts
**Risk:** Vulnerable to brute force attacks
**Recommendation:** Add fields:

```typescript
failedLoginAttempts: integer("failed_login_attempts").default(0),
lastFailedLoginAt: timestamp("last_failed_login_at"),
lockedUntil: timestamp("locked_until"),
```

#### 4. No Email Verification Status

**Location:** `users` table (lines 38-65)
**Issue:** No field to track if email is verified
**Risk:** Users can use unverified emails, potential for spam accounts
**Recommendation:** Add:

```typescript
emailVerified: boolean("email_verified").default(false),
emailVerifiedAt: timestamp("email_verified_at"),
```

### Important Issues

#### 5. No Rate Limiting Mechanism

**Location:** `familyInvitations` table (lines 188-219)
**Issue:** No database-level constraints to prevent invitation spam
**Risk:** Users can send unlimited invitations
**Recommendation:** Consider adding invitation quota tracking or implement at application layer

#### 6. JSONB Fields Unbounded

**Location:** `users.dashboardConfig` (line 51), `corkboardPosts.data` (line 123)
**Issue:** No size limits on JSONB fields
**Risk:** Could be exploited with massive payloads causing storage/performance issues
**Recommendation:** Add CHECK constraints or application-level validation with size limits

---

## 🏗️ Design Flaws

### Critical Issues

#### 7. Inconsistent Naming Convention

**Location:** Throughout schema
**Issue:** Mix of `camelCase` (createdAt, updatedAt, dashboardConfig) and `snake_case` (family_id, creator_id, user_id)
**Impact:** Code confusion, increased likelihood of bugs, poor maintainability
**Examples:**

- `users.createdAt` vs `families.created_at`
- `users.dashboardConfig` vs `corkboard_posts.family_id`

**Recommendation:** Choose one convention (preferably snake_case for PostgreSQL) and apply consistently

#### 8. Missing Enums for Validation

##### a) Family Invitation Status

**Location:** `familyInvitations.status` (line 202)
**Issue:** Uses plain `text` field with default 'pending'
**Risk:** Invalid values like 'pendng', 'PENDING', 'completed' could be inserted
**Recommendation:**

```typescript
export const invitationStatusEnum = pgEnum("invitation_status", [
    "pending",
    "accepted",
    "declined",
    "expired",
]);
```

##### b) Family Member Role

**Location:** `familyMembers.role` (line 178)
**Issue:** Plain text field with no validation
**Risk:** Inconsistent role names leading to authorization bugs
**Recommendation:**

```typescript
export const familyRoleEnum = pgEnum("family_role", [
    "manager",
    "member",
    "viewer",
]);
```

### Important Issues

#### 9. No Automatic updatedAt Triggers

**Location:** All tables with `updatedAt` fields
**Issue:** Fields have default `now()` but won't auto-update on row changes
**Impact:** Timestamps won't reflect actual last update time
**Recommendation:** Create PostgreSQL trigger or handle in application layer:

```sql
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 10. Inconsistent Role Handling

**Location:** `roles` table (lines 30-36) vs `familyMembers.role` (line 178)
**Issue:** System roles use dedicated normalized table, family roles are plain text
**Impact:** Inconsistent data modeling, harder to manage family permissions
**Recommendation:** Consider using same `roles` table with a `scope` field, or create separate `familyRoles` table

#### 11. Missing Timestamps on Junction Tables

**Location:** `familyMembers` (lines 169-186), `userRoles` (lines 67-84)
**Issue:** No `created_at` or `updated_at` fields
**Impact:** Cannot track when user joined family or when role was assigned/changed
**Recommendation:** Add timestamps to junction tables:

```typescript
createdAt: timestamp("created_at").notNull().defaultNow(),
updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
```

---

## ⚠️ Edge Cases

### Critical Issues

#### 12. Incomplete Soft Delete Implementation

**Location:** `families.deleted_at` (line 155)
**Issue:** Soft delete field exists but foreign key actions (CASCADE, SET NULL) only trigger on hard deletes
**Impact:** Soft-deleted families still show up in related queries
**Recommendation:**

- Add `deleted_at` to related tables (family_members, family_invitations, corkboard_posts)
- Always filter with `WHERE deleted_at IS NULL` in queries
- Consider database views for active families

#### 13. Orphaned Corkboard Posts

**Location:** `corkboardPosts.family_id` (line 119)
**Issue:** Uses `onDelete: "set null"` when family is deleted
**Impact:** Posts become orphaned with no family context
**Recommendation:** Change to `onDelete: "cascade"` or implement soft delete cascade

#### 14. No Duplicate Invitation Prevention

**Location:** `familyInvitations` table (lines 188-219)
**Issue:** No unique constraint on `(family_id, invited_email, status)`
**Impact:** Same email can receive multiple pending invitations for same family
**Recommendation:** Add unique constraint:

```typescript
familyEmailStatusUnique: index("family_invitations_unique_pending")
    .on(table.family_id, table.invited_email)
    .where(sql`status = 'pending'`),
```

### Important Issues

#### 15. No Family Ownership Transfer

**Location:** `families.creator_id` (line 148)
**Issue:** When creator is deleted, entire family is CASCADE deleted
**Impact:** Users can't leave family they created without destroying it
**Recommendation:**

- Add `onDelete: "restrict"` and require ownership transfer first
- Or implement ownership transfer mechanism before allowing creator deletion

#### 16. Invitations to Existing Members

**Location:** `familyInvitations` and `familyMembers` tables
**Issue:** No constraint preventing invitations to users already in family
**Impact:** Confusing UX, unnecessary invitations
**Recommendation:** Add application-level check or database CHECK constraint

#### 17. Unregistered User Invitation Handling

**Location:** `familyInvitations.invited_email` (line 200)
**Issue:** No mechanism to automatically match invitations when invited user signs up
**Impact:** Requires manual email matching logic
**Recommendation:** Document this flow or add `accepted_by_user_id` field to track acceptance

---

## ⚡ Performance Optimizations

### Missing Composite Indexes

#### 18. Active Sessions Per User

**Location:** `sessions` table (lines 86-108)
**Current:** Separate indexes on `userId` and `expiresAt`
**Issue:** Queries like "find active sessions for user" scan both indexes
**Recommendation:**

```typescript
userActiveSessionsIndex: index("sessions_user_active_idx")
    .on(table.userId, table.expiresAt),
```

#### 19. Family Timeline Queries

**Location:** `corkboardPosts` table (lines 110-139)
**Current:** Separate indexes on `family_id` and `createdAt`
**Issue:** Fetching family posts sorted by date requires two index scans
**Recommendation:**

```typescript
familyTimelineIndex: index("corkboard_posts_family_timeline_idx")
    .on(table.family_id, table.createdAt.desc()),
```

#### 20. Pending Family Invitations

**Location:** `familyInvitations` table (lines 188-219)
**Current:** Separate indexes
**Issue:** Filtering pending invitations per family is common but not optimized
**Recommendation:**

```typescript
familyPendingIndex: index("family_invitations_pending_idx")
    .on(table.family_id, table.status),
```

### Missing Partial Indexes

#### 21. Active Sessions Only

**Location:** `sessions.expiresAt` (line 103)
**Issue:** Index includes expired sessions that are rarely queried
**Recommendation:**

```typescript
activeSessionsIndex: index("sessions_active_idx")
    .on(table.expiresAt)
    .where(sql`expires_at > now()`),
```

#### 22. Active Families Only

**Location:** `families.deleted_at` (line 162)
**Issue:** Most queries need active families, but index includes deleted ones
**Recommendation:**

```typescript
activeFamiliesIndex: index("families_active_idx")
    .on(table.created_at)
    .where(sql`deleted_at IS NULL`),
```

#### 23. Pending Invitations Only

**Location:** `familyInvitations` table
**Issue:** Accepted/declined invitations rarely queried but included in indexes
**Recommendation:**

```typescript
pendingInvitationsIndex: index("family_invitations_pending_only_idx")
    .on(table.family_id, table.invited_email)
    .where(sql`status = 'pending'`),
```

### Missing Specialized Indexes

#### 24. JSONB Field Indexes

**Location:** `users.dashboardConfig` (line 51), `corkboardPosts.data` (line 123)
**Issue:** Queries within JSONB fields require sequential scans
**Impact:** Slow queries when searching JSON properties
**Recommendation:**

```typescript
// For users table
dashboardConfigIndex: index("users_dashboard_config_gin_idx")
    .on(table.dashboardConfig)
    .using("gin"),

// For corkboard_posts table
dataIndex: index("corkboard_posts_data_gin_idx")
    .on(table.data)
    .using("gin"),
```

#### 25. Hash Indexes for Token Lookups

**Location:** Token fields in `sessions` (line 102) and `familyInvitations` (line 216)
**Issue:** B-tree indexes used for equality-only lookups
**Recommendation:** Consider hash indexes for exact match queries (PostgreSQL 10+)

---

## 📊 Data Integrity Issues

#### 26. No Length Constraints on Text Fields

**Location:** Multiple tables
**Issue:** Fields like `username`, `display_name`, `family.name` have no length limits
**Risk:** Storage bloat, UI display issues, potential abuse
**Recommendation:** Add reasonable limits:

```typescript
username: text("username").notNull().unique().$type<string & { length: 3..50 }>(),
display_name: text("display_name").$type<string & { length: 1..100 }>(),
// Or use varchar with explicit limits
```

#### 27. No Unique Constraint on Active Invitations

**Location:** `familyInvitations` table
**Issue:** Can have multiple pending invitations for same email to same family
**Impact:** Confusion about which invitation to accept
**Recommendation:** Partial unique index (see #14)

#### 28. Missing CHECK Constraints

**Location:** Throughout schema
**Issue:** No validation for:

- Email format in `users.email`
- Positive expiration dates (expiresAt > createdAt)
- Valid role names
  **Recommendation:** Add CHECK constraints where appropriate (though validation typically done at application layer)

---

## 📈 Scalability Concerns

#### 29. No Data Retention/Archival Strategy

**Location:** `sessions` table, `corkboardPosts` table
**Issue:** Data grows indefinitely with no cleanup mechanism
**Impact:** Database bloat, slower queries over time
**Recommendation:**

- Implement cleanup jobs for expired sessions
- Archive old corkboard posts
- Define retention policies

#### 30. No Partitioning Strategy

**Location:** High-growth tables (`sessions`, `corkboardPosts`)
**Issue:** Tables will become large, impacting query performance
**Recommendation:** Consider partitioning strategies:

- `sessions`: Partition by `expiresAt` (monthly)
- `corkboardPosts`: Partition by `createdAt` (yearly)

#### 31. No Audit Trail

**Location:** All tables
**Issue:** No history of changes to critical data
**Impact:** Cannot investigate data issues, no compliance trail
**Recommendation:** Consider adding audit tables or using PostgreSQL temporal tables

---

## 🛡️ GDPR/Privacy Considerations

#### 32. No Anonymization Strategy

**Location:** All CASCADE delete operations
**Issue:** User deletion removes all data; can't anonymize for legal retention
**Impact:** May violate legal requirements to retain certain data
**Recommendation:**

- Add `anonymized_at` timestamp to users
- Replace CASCADE with SET NULL + anonymization process
- Implement data anonymization instead of deletion

#### 33. No Consent Tracking

**Location:** Missing from schema
**Issue:** No mechanism to track user consent for data processing
**Impact:** GDPR compliance risk
**Recommendation:** Add consent tracking table:

```typescript
export const userConsents = pgTable("user_consents", {
    id: uuid("id")
        .primaryKey()
        .default(sql`uuidv7()`),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id),
    consentType: text("consent_type").notNull(), // 'marketing', 'analytics', etc.
    granted: boolean("granted").notNull(),
    grantedAt: timestamp("granted_at").notNull().defaultNow(),
});
```

#### 34. No Data Export Capability

**Location:** Schema design
**Issue:** No structured way to export user's complete data
**Impact:** Cannot fulfill GDPR right to data portability
**Recommendation:** Design export functionality considering all user-related tables

---

## 📋 Prioritized Recommendations

### 🔴 High Priority (Security & Data Integrity)

_Should be implemented before production_

1. **Add enums for status and role fields** (#8) - Prevents data integrity issues
2. **Implement updatedAt triggers** (#9) - Essential for accurate timestamp tracking
3. **Fix naming convention inconsistency** (#7) - Prevents bugs and improves maintainability
4. **Add composite indexes** (#18-20) - Critical for query performance
5. **Add length constraints** (#26) - Prevents abuse and storage issues
6. **Fix soft delete handling** (#12-13) - Prevents data leaks

### 🟡 Medium Priority (Functionality & Performance)

_Should be implemented in near future_

7. **Add timestamps to junction tables** (#11) - Important for audit trail
8. **Implement family ownership transfer** (#15) - Critical UX improvement
9. **Add GIN indexes for JSONB** (#24) - Significant performance improvement if querying JSON
10. **Add partial indexes** (#21-23) - Optimize common queries
11. **Add unique constraint for invitations** (#14) - Prevents confusion
12. **Add email verification status** (#4) - Important security feature

### 🟢 Low Priority (Future Considerations)

_Nice to have, can be deferred_

13. **Session metadata tracking** (#2) - Enhanced security monitoring
14. **Failed login tracking** (#3) - Brute force protection
15. **Audit logging table** (#31) - Compliance and debugging
16. **Data retention policies** (#29) - Long-term maintenance
17. **Table partitioning** (#30) - Scale optimization
18. **GDPR compliance features** (#32-34) - Required for EU users

---

## 📝 Notes

- This review assumes password hashing is handled at the application layer
- Some recommendations (like triggers, cleanup jobs) require implementation outside the schema file
- Performance recommendations should be validated with actual query patterns and load testing
- GDPR recommendations depend on your specific compliance requirements

---

## 🔍 Review Methodology

This review examined:

- ✅ Table structure and field types
- ✅ Foreign key relationships and cascade behaviors
- ✅ Index coverage and optimization opportunities
- ✅ Naming conventions and consistency
- ✅ Security implications of design choices
- ✅ Edge cases and data integrity
- ✅ Scalability considerations
- ✅ Compliance requirements (GDPR)

**Reviewer:** Claude (AI Assistant)
**Review Date:** 2025-11-06
**Schema Version:** Current (as of feat/containerize-dev-env branch)
