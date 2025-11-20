---
title: "Code Review: Issue #53 - Edge Case Tests for All Services"
date: 2025-11-20
reviewer: Claude Code
branch: test/#53_edge-cases-for-all-services
issue: #53
status: changes-requested
related_documents:
    - vibes/251117_phase3-implementation-guide.md
    - vibes/251118_phase3-breakdown.md
tags:
    - code-review
    - testing
    - edge-cases
    - phase3
priority: high
---

# Code Review: Issue #53 - Edge Case Tests for All Services

## Executive Summary

**Overall Assessment:** GOOD with RECOMMENDED IMPROVEMENTS

**Status:** Changes Requested
**Coverage:** ~25% of Edge Case Requirements
**Critical Issues:** 3 must-fix items
**Recommended Issues:** 6 improvements

Your implementation successfully adds edge case testing infrastructure and addresses several critical scenarios. However, there are **completeness gaps**, **correctness issues**, and **opportunities for improvement** in maintainability and consistency.

**Recommendation:** Fix 3 critical issues before merging. Consider splitting remaining work into focused follow-up issues.

---

## Table of Contents

1. [Completeness Assessment](#1-completeness-assessment)
2. [Correctness & Accuracy](#2-correctness--accuracy)
3. [Maintainability](#3-maintainability)
4. [Style & Consistency](#4-style--consistency)
5. [Recommendations](#5-recommendations)
6. [Test Coverage Summary](#6-test-coverage-summary)
7. [Final Verdict](#7-final-verdict)

---

## 1. Completeness Assessment

### ✅ What's Implemented Well

**Families Service (`test/nuxt/services/families.spec.ts`):**

- ✅ Non-existent resource handling (transferOwnership scenarios)
- ✅ Unicode and special character support

**Invitations Service (`test/nuxt/services/invitations.spec.ts`):**

- ✅ Non-existent resources (invalid tokens, non-existent families)
- ✅ Used/expired invitation handling
- ✅ Email mismatch validation
- ✅ Soft-deleted manager prevention

**Users Service (`test/nuxt/services/users.spec.ts`):**

- ✅ Unicode support for usernames, display names, and emails

**Service Layer Enhancements:**

- ✅ Enhanced `transferOwnership` validation (server/services/families.ts:117-177)
- ✅ Enhanced `createInvitation` family existence check (server/services/invitations.ts:36-53)
- ✅ Username validation now supports Unicode (server/services/users.ts:126)

### ❌ Missing Coverage (Per Phase 3 Guide)

Based on the [Edge Case Testing Checklist](vibes/251117_phase3-implementation-guide.md:1390-1399):

**Category 1: Non-Existent Resources** - PARTIALLY COMPLETE (60%)

- ❌ Missing tests for deleted resources (e.g., operations on families that have been deleted)
- ❌ families.spec.ts: Empty test for "getting a non-existent family" (commented out)

**Category 2: Soft-Deleted Resources** - INCOMPLETE (20%)

- ✅ One test for soft-deleted managers in invitations (invitations.spec.ts:133-165)
- ❌ Missing: soft-deleted users trying to perform operations
- ❌ Missing: soft-deleted families in queries
- ❌ Missing: comprehensive soft-delete coverage across all services

**Category 3: Empty Collections** - NOT IMPLEMENTED (10%)

- ❌ families.spec.ts: Two todo tests (getUserFamilies, getFamilyMembers)
- ❌ users.spec.ts: Limited test (can't truly test empty state due to admin user)
- ❌ invitations.spec.ts: No empty collection tests

**Category 4: Unicode/Special Characters** - PARTIALLY COMPLETE (70%)

- ✅ Families: one test (families.spec.ts:587-601)
- ✅ Users: two tests (users.spec.ts:237-270)
- ❌ Invitations: no Unicode tests (e.g., Unicode in invitation emails)

**Missing Categories:**

- ❌ **Minimum/maximum values** - Not tested (0%)
- ❌ **Null handling** - Not explicitly tested (relying on TypeScript) (0%)
- ❌ **Boundary conditions** - Not tested (e.g., exactly at length limits) (0%)

---

## 2. Correctness & Accuracy

### 🐛 CRITICAL ISSUES

#### Issue 1: Invalid UUID Handling - Wrong Error Type

**Severity:** 🔴 CRITICAL
**Location:** `server/services/families.ts:124-131`, `families.ts:146-153`, `server/services/invitations.ts:42-49`

**Problem:** The services conflate "invalid UUID format" with "resource not found", which are semantically different errors.

**Current Code:**

```typescript
// server/services/families.ts:124-131
try {
    family = await dbConnection.query.families.findFirst({
        where: eq(families.id, familyId),
    });
} catch (error: any) {
    if (error.cause?.code === "22P02") {
        throw new NotFoundError("Family not found");
    }
    throw error;
}
```

**Why it's wrong:**

- `22P02` is a PostgreSQL error code for "invalid text representation" (malformed UUID)
- `NotFoundError` (404) implies the resource might have existed but doesn't
- `ValidationError` (400) means the input itself is malformed

**Recommended Fix:**

```typescript
try {
    family = await dbConnection.query.families.findFirst({
        where: eq(families.id, familyId),
    });
} catch (error: any) {
    if (error.cause?.code === "22P02") {
        throw new ValidationError("Invalid family ID format");
    }
    throw error;
}

if (!family) {
    throw new NotFoundError("Family not found");
}
```

**Impact:** HTTP status codes will be incorrect. Clients will receive 404 instead of 400 for malformed UUIDs.

**Affected Files:**

- `server/services/families.ts:124-131` (family lookup in transferOwnership)
- `server/services/families.ts:146-153` (new owner lookup in transferOwnership)
- `server/services/invitations.ts:42-49` (family lookup in createInvitation)

---

#### Issue 2: Inconsistent Error Types - "New Owner Does Not Exist"

**Severity:** 🔴 CRITICAL
**Location:** `server/services/families.ts:157`

**Problem:** Using `ValidationError` for a non-existent resource instead of `NotFoundError`.

**Current Code:**

```typescript
if (!newOwner) {
    throw new ValidationError("New owner does not exist");
}
```

**Why it's wrong:**

- `ValidationError` (400): Input format is invalid
- `NotFoundError` (404): Resource doesn't exist

A valid UUID format pointing to a non-existent user is a "not found" condition, not invalid input.

**Recommended Fix:**

```typescript
if (!newOwner) {
    throw new NotFoundError("User not found");
}
```

**Impact:** Incorrect HTTP status code (400 instead of 404). Semantically confusing error.

---

#### Issue 3: Unsafe Username Validation Regex

**Severity:** 🔴 CRITICAL (Security)
**Location:** `server/services/users.ts:126`

**Problem:** `\p{S}` allows **all symbols**, including potentially dangerous characters.

**Current Code:**

```typescript
if (!/^[\p{L}\p{S}0-9_-]+$/u.test(username)) {
    throw new ValidationError(
        "Username can only contain letters, numbers, underscores, hyphens, and symbols",
    );
}
```

**Why it's dangerous:**

- `\p{S}` matches ALL Unicode symbol categories: currency, math, arrows, **control characters**, etc.
- Usernames might be used in URLs (`/users/username`) or API paths
- Could break routing, create XSS vectors, or cause encoding issues

**Examples that would pass:**

- `user©®™` (trademark symbols)
- `user←→` (arrows)
- `user$€¥` (currency)
- `user✓✗` (check marks)

**Recommended Fix (Conservative):**

```typescript
// Allow Unicode letters and numbers, but restrict symbols to safe set
if (!/^[\p{L}\p{N}_-]+$/u.test(username)) {
    throw new ValidationError(
        "Username can only contain letters, numbers, underscores, and hyphens",
    );
}
```

**Recommended Fix (With Emojis):**

```typescript
// Explicitly allow emojis if desired
if (!/^[\p{L}\p{N}\p{Emoji}_-]+$/u.test(username)) {
    throw new ValidationError(
        "Username can only contain letters, numbers, emojis, underscores, and hyphens",
    );
}
```

**Impact:** Potential security vulnerabilities, routing issues, URL encoding problems.

---

### ⚠️ ACCURACY CONCERNS

#### Concern 1: Misleading Test Name

**Severity:** 🟡 MODERATE
**Location:** `test/nuxt/services/users.spec.ts:228-236`

**Problem:** Test name doesn't match what's being tested.

**Current Code:**

```typescript
it("should return an empty array when no users exist", async () => {
    await withTestTransaction(async (tx) => {
        // Note: withTestTransaction creates at least one admin user
        const admin = await createTestAdminUser(tx);
        const users = await getAllUsersWithRoles(tx, admin.id);
        // In this setup, we expect at least the admin user.
        expect(users.length).toBeGreaterThanOrEqual(1);
    });
});
```

**Why it's wrong:**

- Test name: "when no users exist"
- Test assertion: "at least one user exists"
- These are contradictory

**Recommended Fix:**
Rename to match actual behavior:

```typescript
it("should return all users including the admin", async () => {
    await withTestTransaction(async (tx) => {
        const admin = await createTestAdminUser(tx);
        const users = await getAllUsersWithRoles(tx, admin.id);
        expect(users.length).toBeGreaterThanOrEqual(1);
        expect(users.some((u) => u.id === admin.id)).toBe(true);
    });
});
```

---

#### Concern 2: Test Will Pass for Wrong Reason

**Severity:** 🟡 MODERATE
**Location:** `test/nuxt/services/families.spec.ts:544`, `families.spec.ts:560`

**Issue:** Good practice using proper UUID format (`00000000-0000-0000-0000-000000000000`) ✅

**However:** Given the error handling bug in Issue #1, these tests will currently pass by catching UUID parse errors as `NotFoundError`, which is incorrect behavior.

**Action Required:** After fixing Issue #1, verify these tests still pass correctly.

---

## 3. Maintainability

### ✅ Strengths

1. **Clear Test Organization:** The `describe("Edge Cases")` blocks are well-structured
2. **Descriptive Test Names:** Test descriptions clearly state what's being tested
3. **Good Use of Fixtures:** Leveraging `createFamilyWithMembers`, `createExpiredInvitation`, etc.
4. **TODO Tests:** Appropriately marked unimplementable tests as `.todo()` instead of commenting them out

### ❌ Areas for Improvement

#### 1. Duplicated Error Handling Pattern

**Severity:** 🟡 MODERATE
**Location:** Multiple service files

**Problem:** The try-catch pattern for UUID validation is repeated 3+ times across services.

**Recommended Solution:**
Extract to a shared helper:

```typescript
// server/lib/validation.ts
export async function findResourceOrThrow<T>(
    findFn: () => Promise<T | undefined>,
    resourceName: string,
): Promise<T> {
    let resource;
    try {
        resource = await findFn();
    } catch (error: any) {
        if (error.cause?.code === "22P02") {
            throw new ValidationError(`Invalid ${resourceName} ID format`);
        }
        throw error;
    }

    if (!resource) {
        throw new NotFoundError(`${resourceName} not found`);
    }

    return resource;
}
```

**Usage Example:**

```typescript
// Instead of 9 lines of try-catch
const family = await findResourceOrThrow(
    () =>
        dbConnection.query.families.findFirst({
            where: eq(families.id, familyId),
        }),
    "Family",
);
```

**Benefits:**

- Reduces code duplication
- Ensures consistent error handling
- Single place to update logic
- More maintainable

---

#### 2. Inconsistent Test Patterns for Missing Functions

**Location:** Various test files

**Issue:** Mixing commented-out tests with `.todo()` tests.

**Examples:**

**families.spec.ts:**

```typescript
it("should return an empty array when a user has no families", async () => {
    // This test requires a getUserFamilies function, which doesn't exist yet.
});
```

**invitations.spec.ts:**

```typescript
it.todo(
    "should return undefined when getting an invitation by a non-existent token",
    async () => {
        // This test requires a getInvitationByToken function which does not exist yet.
        // await withTestTransaction(async (tx) => {
        //     const result = await getInvitationByToken(tx, "non-existent-token");
        //     expect(result).toBeUndefined();
        // });
    },
);
```

**Recommendation:** Use `.todo()` consistently for all unimplementable tests. Optionally include commented code for future reference.

---

#### 3. Missing Test Documentation for Complex Scenarios

**Location:** `test/nuxt/services/invitations.spec.ts:133`

**Current:**

```typescript
it("should prevent a soft-deleted manager from creating an invitation", async () => {
```

**Recommended Addition:**

```typescript
it("should prevent a soft-deleted manager from creating an invitation", async () => {
    // Edge case: Manager's membership is soft-deleted but user still exists
    // Expected: ForbiddenError (not authorized as manager anymore)
    // This ensures soft-delete is respected in authorization checks
```

**Benefits:**

- Clarifies the test's purpose
- Documents expected behavior
- Helps future maintainers understand edge cases

---

## 4. Style & Consistency

### ✅ Good Practices

1. ✅ Consistent use of `await withTestTransaction`
2. ✅ Proper async/await patterns
3. ✅ Using domain errors (`NotFoundError`, `ValidationError`, etc.)
4. ✅ Formatting appears correct (based on staged changes)

### ❌ Style Issues

#### Issue 1: Inconsistent Error Messages

**Severity:** 🟢 MINOR
**Location:** Multiple service files

**Current State:**

- `families.ts:134`: "Family not found"
- `families.ts:157`: "New owner does not exist" (should be "User not found")
- `invitations.ts:52`: "Family not found"

**Recommendation:**
Standardize error messages using a consistent pattern:

```typescript
// Pattern: "{ResourceType} not found"
throw new NotFoundError("Family not found");
throw new NotFoundError("User not found");
throw new NotFoundError("Invitation not found");
```

**Benefits:**

- Predictable error messages
- Easier to search/grep
- Better API consistency

---

#### Issue 2: Mixed Comment Styles

**Severity:** 🟢 MINOR
**Location:** Test files

**Example 1 (families.spec.ts):**

```typescript
it("should return an empty array when a user has no families", async () => {
    // This test requires a getUserFamilies function, which doesn't exist yet.
});
```

**Example 2 (invitations.spec.ts):**

```typescript
it.todo("should return undefined...", async () => {
    // This test requires a getInvitationByToken function which does not exist yet.
    // await withTestTransaction(async (tx) => {
    //     const result = await getInvitationByToken(tx, "non-existent-token");
    //     expect(result).toBeUndefined();
    // });
});
```

**Recommendation:**
Use `.todo()` consistently for all unimplementable tests. Include skeleton code when helpful:

```typescript
it.todo("should return empty array when user has no families", async () => {
    // Requires: getUserFamilies function
    // await withTestTransaction(async (tx) => {
    //     const user = await createTestUser(tx);
    //     const families = await getUserFamilies(tx, user.id);
    //     expect(families).toEqual([]);
    // });
});
```

---

## 5. Recommendations

### 🔴 MUST FIX (Before Merging)

**Priority 1 - Critical Issues:**

1. **Fix UUID error handling in all services** (Issue #1)
    - **Files:** `server/services/families.ts` (lines 124-131, 146-153), `server/services/invitations.ts` (lines 42-49)
    - **Change:** Throw `ValidationError` for invalid UUID format (PostgreSQL error 22P02)
    - **Change:** Throw `NotFoundError` only when resource lookup returns null/undefined
    - **Impact:** Correct HTTP status codes (400 vs 404)

2. **Fix error type consistency** (Issue #2)
    - **File:** `server/services/families.ts:157`
    - **Change:** "New owner does not exist" from `ValidationError` to `NotFoundError`
    - **Impact:** Semantically correct error types

3. **Review username validation regex** (Issue #3)
    - **File:** `server/services/users.ts:126`
    - **Change:** Restrict `\p{S}` to safe symbols or use `\p{L}\p{N}` only
    - **Impact:** Security (prevent dangerous characters in URLs/routing)
    - **Test:** Verify with potentially dangerous usernames

### 🟡 SHOULD FIX (Recommended)

**Priority 2 - Completeness:**

4. **Add missing edge case categories:**
    - Soft-deleted resources (comprehensive coverage across all services)
    - Deleted resources (operations on hard-deleted families)
    - Minimum/maximum value boundary tests (e.g., family name at exactly 100 chars)

5. **Implement empty collection tests when functions exist:**
    - `getUserFamilies` (families service)
    - `getFamilyMembers` (families service)
    - Empty invitations list scenarios

6. **Add Unicode tests for invitations:**
    - Unicode email addresses in invitations
    - Special characters in family names via invitation flow
    - International characters in invitation messages (if applicable)

### 🟢 NICE TO HAVE (Future Improvements)

**Priority 3 - Maintainability:**

7. **Extract error handling helper** (Section 3.1)
    - Create `findResourceOrThrow` utility
    - Reduces duplication across 3+ files
    - Ensures consistent error handling

8. **Add test documentation** for complex scenarios (Section 3.3)
    - Explain edge case context
    - Document expected behavior
    - Help future maintainers

9. **Standardize error messages** across services (Section 4.1)
    - Use consistent pattern: "{ResourceType} not found"
    - Make API responses predictable

---

## 6. Test Coverage Summary

### Edge Case Categories Coverage

| Category               | Families | Invitations |  Users  | Overall Status |
| ---------------------- | :------: | :---------: | :-----: | :------------: |
| Non-Existent Resources |  🟡 60%  |   ✅ 80%    | 🟡 40%  |     🟡 60%     |
| Deleted Resources      |  ❌ 0%   |    ❌ 0%    |  ❌ 0%  |     ❌ 0%      |
| Soft-Deleted Resources |  ❌ 0%   |   ✅ 30%    |  ❌ 0%  |     🟡 20%     |
| Empty Collections      |  ❌ 0%   |    ❌ 0%    | 🟡 20%  |     🟡 10%     |
| Unicode/Special Chars  |  ✅ 70%  |    ❌ 0%    | ✅ 100% |     ✅ 70%     |
| Min/Max Values         |  ❌ 0%   |    ❌ 0%    |  ❌ 0%  |     ❌ 0%      |
| Null Handling          |  ❌ 0%   |    ❌ 0%    |  ❌ 0%  |     ❌ 0%      |
| Boundary Conditions    |  ❌ 0%   |    ❌ 0%    |  ❌ 0%  |     ❌ 0%      |

**Overall Edge Case Coverage: ~25%**

### Test Count by Service

| Service     | New Tests | TODO Tests | Total  |
| ----------- | :-------: | :--------: | :----: |
| Families    |     3     |     2      |   5    |
| Invitations |     6     |     1      |   7    |
| Users       |     3     |     1      |   4    |
| **TOTAL**   |  **12**   |   **4**    | **16** |

### Phase 3 Edge Case Checklist Status

Based on [vibes/251117_phase3-implementation-guide.md:1390-1399](vibes/251117_phase3-implementation-guide.md#edge-case-testing-checklist):

- [ ] Test non-existent resource IDs (60% complete)
- [ ] Test deleted resources (0% complete)
- [ ] Test soft-deleted resources (20% complete)
- [ ] Test empty collections (10% complete)
- [x] Test Unicode and special characters (70% complete)
- [ ] Test minimum/maximum values (0% complete)
- [ ] Test null handling (0% complete)
- [ ] Test boundary conditions (0% complete)

**Checklist Completion: 1/8 items (12.5%)**

---

## 7. Final Verdict

### Summary

**Strengths:**

- ✅ Good test structure and organization
- ✅ Proper use of test fixtures
- ✅ Unicode support implemented well
- ✅ Some critical edge cases covered (non-existent resources, soft-deleted managers)

**Weaknesses:**

- ❌ 3 critical correctness issues (UUID handling, error types, regex security)
- ❌ Incomplete coverage (~25% of edge case categories)
- ❌ Missing entire categories (deleted resources, min/max, null, boundaries)
- ❌ Some code duplication in error handling

### What to Do Before Merging

**BLOCKING ISSUES (Must Fix):**

1. ✅ **Fix UUID error handling** (Issue #1)
    - Files: `families.ts`, `invitations.ts`
    - Change: `NotFoundError` → `ValidationError` for PostgreSQL error 22P02

2. ✅ **Fix error type consistency** (Issue #2)
    - File: `families.ts:157`
    - Change: "New owner does not exist" to use `NotFoundError`

3. ✅ **Review username validation regex** (Issue #3)
    - File: `users.ts:126`
    - Change: Restrict `\p{S}` to safe characters
    - Test: Verify with edge case usernames

**RECOMMENDED IMPROVEMENTS:**

4. Add deleted resource tests
5. Expand soft-delete coverage to all services
6. Implement Unicode tests for invitations
7. Consider extracting error handling helper

### Decision: Changes Requested

**This PR cannot be merged in its current state** due to 3 critical correctness issues.

However, the implementation shows good understanding and provides a solid foundation. After fixing the critical issues, this would be a valuable incremental contribution to Issue #53.

### Suggested Approach

**Option 1: Fix and Merge (Recommended)**

1. Fix the 3 critical issues
2. Merge as "Part 1" of Issue #53 implementation
3. Create follow-up issues for remaining coverage:
    - Issue: "Add soft-delete edge case tests (all services)"
    - Issue: "Add deleted resource edge case tests"
    - Issue: "Add boundary value tests (min/max/null)"

**Option 2: Complete Coverage First**

1. Fix the 3 critical issues
2. Add tests to reach ~60-70% coverage
3. Merge as more complete implementation

**Recommendation:** Go with **Option 1**. Incremental, correct implementations are better than delayed, comprehensive ones.

---

## Appendix: Files Changed Summary

### Service Files Modified (3)

| File                             | Lines Changed | Purpose                               |
| -------------------------------- | ------------- | ------------------------------------- |
| `server/services/families.ts`    | +31           | Enhanced transferOwnership validation |
| `server/services/invitations.ts` | +17           | Added family existence check          |
| `server/services/users.ts`       | +1            | Updated username regex for Unicode    |

### Test Files Modified (3)

| File                                     | Tests Added | TODO Tests | Purpose                         |
| ---------------------------------------- | ----------- | ---------- | ------------------------------- |
| `test/nuxt/services/families.spec.ts`    | 3           | 2          | Non-existent resources, Unicode |
| `test/nuxt/services/invitations.spec.ts` | 6           | 1          | Comprehensive edge cases        |
| `test/nuxt/services/users.spec.ts`       | 3           | 1          | Unicode and empty collections   |

---

## Next Steps

1. **Review this document** and decide on approach (Option 1 vs Option 2)
2. **Fix critical issues** (#1, #2, #3 above)
3. **Run test suite** to verify all tests pass
4. **Update this review** with retest results
5. **Merge or iterate** based on chosen approach

---

**Review Completed:** 2025-11-20
**Reviewer:** Claude Code
**Branch:** `test/#53_edge-cases-for-all-services`
**Status:** Changes Requested
