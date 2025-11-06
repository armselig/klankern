# Database Timestamp Management

This document describes the automatic timestamp management system implemented in the Klankern database schema.

## Overview

The database now includes automatic timestamp tracking for all tables with `updated_at` fields and timestamp fields on junction tables to track relationship changes.

## Features

### 1. Junction Table Timestamps

Junction tables now include `created_at` and `updated_at` fields to track when relationships were established and modified:

- **`family_members`**: Track when users join/leave families and role changes
- **`user_roles`**: Track when roles are assigned/modified for users

### 2. Automatic `updated_at` Updates

A database trigger automatically updates the `updated_at` timestamp whenever a row is modified in the following tables:

- `users`
- `families`
- `family_invitations`
- `corkboard_posts`
- `family_members`
- `user_roles`

## Implementation

### Trigger Function

A reusable PL/pgSQL function handles timestamp updates:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### Triggers

Each table with an `updated_at` field has a `BEFORE UPDATE` trigger:

```sql
CREATE TRIGGER update_<table>_updated_at
    BEFORE UPDATE ON <table>
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Migrations

The feature is implemented across two migration files:

### Migration 0004: Add Junction Table Timestamps

**File**: `0004_needy_black_cat.sql`

Adds `created_at` and `updated_at` columns to junction tables:
- `family_members`
- `user_roles`

Both fields are `NOT NULL` with `DEFAULT now()`.

### Migration 0005: Add Update Triggers

**File**: `0005_add_updated_at_triggers.sql`

Creates the trigger function and attaches triggers to all tables with `updated_at` fields.

## Applying Migrations

To apply these migrations to your database:

```bash
pnpm run db:migrate
```

## Rollback

If you need to rollback these changes:

```sql
-- Drop all triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_families_updated_at ON families;
DROP TRIGGER IF EXISTS update_family_invitations_updated_at ON family_invitations;
DROP TRIGGER IF EXISTS update_corkboard_posts_updated_at ON corkboard_posts;
DROP TRIGGER IF EXISTS update_family_members_updated_at ON family_members;
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Remove timestamp columns from junction tables
ALTER TABLE family_members
  DROP COLUMN created_at,
  DROP COLUMN updated_at;

ALTER TABLE user_roles
  DROP COLUMN created_at,
  DROP COLUMN updated_at;
```

## Testing

### Manual Testing

After applying migrations, you can test the trigger behavior:

```sql
-- Test update trigger
UPDATE users SET first_name = 'Test' WHERE id = '<some-uuid>';
SELECT updated_at FROM users WHERE id = '<some-uuid>';
-- updated_at should show current timestamp

-- Test junction table timestamps
INSERT INTO family_members (family_id, user_id, role) 
VALUES ('<family-uuid>', '<user-uuid>', 'member');
SELECT created_at, updated_at FROM family_members 
WHERE family_id = '<family-uuid>' AND user_id = '<user-uuid>';
-- Both should show current timestamp

-- Test junction table update trigger
UPDATE family_members SET role = 'manager'
WHERE family_id = '<family-uuid>' AND user_id = '<user-uuid>';
SELECT created_at, updated_at FROM family_members 
WHERE family_id = '<family-uuid>' AND user_id = '<user-uuid>';
-- created_at should remain unchanged, updated_at should be newer
```

### Automated Tests

Schema validation tests are located at:
- `test/nuxt/db-timestamps.spec.ts`

Run tests with:
```bash
pnpm run test
```

## Benefits

1. **Audit Trail**: Track when relationships were established and modified
2. **Data Accuracy**: Automatic timestamp updates eliminate manual errors
3. **Debugging**: Easier to identify when data was last changed
4. **Analytics**: Support for temporal queries and change tracking

## Notes

- `created_at` is set once on INSERT and never changes
- `updated_at` is set on INSERT and automatically updated on every UPDATE
- Triggers fire at the database level, so timestamps are updated regardless of how the data is modified (API, direct SQL, etc.)
- The trigger function uses PostgreSQL's `now()` function which returns the transaction timestamp

## Related Issues

- Issue #3: Implement updatedAt Triggers
- Issue #7: Add Timestamps to Junction Tables

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [PostgreSQL Trigger Documentation](https://www.postgresql.org/docs/current/sql-createtrigger.html)
