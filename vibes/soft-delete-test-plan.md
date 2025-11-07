# Soft Delete Implementation Test Plan

This document outlines the testing strategy for the soft delete functionality implemented in issue #12.

## Automated Tests

### Unit Tests

✅ **Helper Function Tests** (`test/nuxt/api/soft-delete-helpers.spec.ts`)

- Tests the `notDeleted()` helper function
- Validates it returns proper SQL conditions for tables with `deleted_at`
- Verifies it handles tables without `deleted_at` properly

### Integration Tests

⚠️ **Database Integration Tests** (Requires manual testing with live database)

The following tests should be run manually with a live database connection:

#### 1. Soft Delete Cascade Tests

**Test: Cascade soft delete to related records**

```typescript
// 1. Create a family with members, invitations, and corkboard posts
// 2. Soft delete the family by setting deleted_at
// 3. Verify all related records have deleted_at set automatically via trigger
```

**Expected Result:**

- Family's `deleted_at` is set
- All family_members records have `deleted_at` set
- All family_invitations records have `deleted_at` set
- All corkboard_posts records have `deleted_at` set

**Test: Updates without soft delete don't trigger cascade**

```typescript
// 1. Update family name without touching deleted_at
// 2. Verify no related records are affected
```

**Expected Result:**

- Related records remain unchanged (deleted_at stays null)

#### 2. Query Filtering Tests

**Test: notDeleted() helper excludes soft-deleted records**

```typescript
// 1. Soft delete a family
// 2. Query family_members with notDeleted(familyMembers)
// 3. Verify no records returned
```

**Expected Result:**

- Query returns empty results for soft-deleted family members

**Test: Soft-deleted families don't appear in user's family list**

```typescript
// 1. User has 2 families
// 2. Soft delete one family
// 3. Call GET /api/families
```

**Expected Result:**

- Only 1 family returned (the non-deleted one)

#### 3. Restore Functionality Tests

**Test: restoreFamily() restores all records**

```typescript
// 1. Soft delete a family (cascade to all related records)
// 2. Call restoreFamily(familyId)
// 3. Verify family and all related records have deleted_at = null
```

**Expected Result:**

- Family restored (deleted_at = null)
- All family_members restored
- All family_invitations restored
- All corkboard_posts restored

**Test: Restore non-deleted family is safe**

```typescript
// 1. Call restoreFamily() on active family
// 2. Verify no errors thrown
```

**Expected Result:**

- Function completes without error
- Family remains active

#### 4. Hard Delete Tests

**Test: Hard delete still cascades properly**

```typescript
// 1. Create family with related records
// 2. Hard delete family (DELETE FROM families)
// 3. Verify CASCADE foreign key constraint removes all related records
```

**Expected Result:**

- All related records are removed from database (not soft deleted)

## Manual Testing Checklist

### API Endpoint Testing

#### Families Endpoints

- [ ] **GET /api/families**
    - Soft-deleted families don't appear
    - Active families appear normally
- [ ] **GET /api/families/:id**
    - Returns 404 for soft-deleted family
    - Returns family data for active family
- [ ] **DELETE /api/families/:id**
    - Sets deleted_at on family
    - Trigger cascades to related records

#### Members Endpoints

- [ ] **GET /api/families/:familyId/members**
    - Only returns non-deleted members
    - Returns 403 if family is soft-deleted
- [ ] **DELETE /api/families/:familyId/members/:userId**
    - Manager can remove members
    - Check uses notDeleted() filter

#### Invitations Endpoints

- [ ] **GET /api/invitations**
    - Doesn't show invitations for soft-deleted families
    - Shows only pending invitations that aren't deleted
- [ ] **POST /api/families/:familyId/invitations**
    - Can't create invitation for soft-deleted family
    - Uses notDeleted() filter in membership check
- [ ] **POST /api/invitations/:token/accept**
    - Can't accept invitation for soft-deleted family
    - Uses notDeleted() filter
- [ ] **POST /api/invitations/:token/decline**
    - Works with notDeleted() filter

### Database Testing

#### Migration Tests

- [ ] **Run migration**
    ```bash
    pnpm run db:migrate
    ```

    - Verify columns added: `family_members.deleted_at`, `family_invitations.deleted_at`, `corkboard_posts.deleted_at`
    - Verify indexes created: `*_deleted_at_idx`
    - Verify trigger function created: `soft_delete_family_cascade()`
    - Verify trigger attached: `cascade_family_soft_delete`

#### Trigger Tests

- [ ] **Test trigger fires on soft delete**
    ```sql
    UPDATE families SET deleted_at = NOW() WHERE id = '<test-id>';
    SELECT * FROM family_members WHERE family_id = '<test-id>';
    ```

    - All members should have deleted_at set
- [ ] **Test trigger doesn't fire on other updates**
    ```sql
    UPDATE families SET name = 'New Name' WHERE id = '<test-id>';
    SELECT * FROM family_members WHERE family_id = '<test-id>';
    ```

    - Members should NOT have deleted_at set

#### Restore Tests

- [ ] **Test restore function**
    ```typescript
    await restoreFamily("<family-id>");
    ```

    - Verify all records restored

## Performance Testing

### Index Verification

Verify indexes are being used for soft delete queries:

```sql
EXPLAIN ANALYZE
SELECT * FROM family_members
WHERE family_id = '<test-id>'
AND deleted_at IS NULL;
```

Expected: Should use `family_members_deleted_at_idx`

## Security Testing

### Authorization Tests

- [ ] Non-managers can't delete families
- [ ] Users can't see soft-deleted families they don't belong to
- [ ] Soft delete permissions same as hard delete

## Rollback Testing

If needed, rollback can be performed:

```sql
-- Drop trigger and function
DROP TRIGGER IF EXISTS cascade_family_soft_delete ON families;
DROP FUNCTION IF EXISTS soft_delete_family_cascade();

-- Remove columns
ALTER TABLE family_members DROP COLUMN deleted_at;
ALTER TABLE family_invitations DROP COLUMN deleted_at;
ALTER TABLE corkboard_posts DROP COLUMN deleted_at;

-- Drop indexes
DROP INDEX IF EXISTS family_members_deleted_at_idx;
DROP INDEX IF EXISTS family_invitations_deleted_at_idx;
DROP INDEX IF EXISTS corkboard_posts_deleted_at_idx;
```

## Test Data Setup

For manual testing, use these scripts to create test data:

```sql
-- Create test family
INSERT INTO families (name, creator_id) VALUES ('Test Family', '<user-id>') RETURNING id;

-- Add members
INSERT INTO family_members (family_id, user_id, role)
VALUES ('<family-id>', '<user-id>', 'manager');

-- Add invitation
INSERT INTO family_invitations (family_id, invited_by_user_id, invited_email, token, expires_at)
VALUES ('<family-id>', '<user-id>', 'test@example.com', 'test-token', NOW() + INTERVAL '7 days');

-- Add corkboard post
INSERT INTO corkboard_posts (user_id, family_id, type, data)
VALUES ('<user-id>', '<family-id>', 'note', '{"content": "Test post"}');
```

## Success Criteria

✅ All automated tests pass
✅ All manual API tests pass
✅ Database trigger works correctly
✅ Query performance is acceptable
✅ No security vulnerabilities introduced
✅ Restore function works correctly
✅ Hard deletes still work properly

## Notes

- Integration tests require a live database connection
- E2E tests can be added later to test full user flows
- Performance should be monitored in production
