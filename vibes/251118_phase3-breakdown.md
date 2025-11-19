---
title: "Phase 3 Test Refactoring - Detailed Breakdown"
date: 2025-11-18
status: proposed
related_documents:
    - vibes/251117_phase3-implementation-guide.md
tags:
    - testing
    - security
    - refactoring
    - phase3
    - planning
priority: high
---

# Phase 3: Security & Edge Cases Testing - Detailed Breakdown

This document outlines a step-by-step breakdown of the Phase 3 test refactoring, as detailed in the [Phase 3 Implementation Guide](vibes/251117_phase3-implementation-guide.md). Each item below is designed to fit into a single GitHub issue and a single GitHub Pull Request, allowing for incremental implementation and review.

---

## ✅ Part 1: Foundational Work - Advanced Test Fixtures (COMPLETE)

This part focused on creating reusable helper functions (fixtures) that significantly simplify the setup of complex test scenarios in subsequent phases. All fixtures have been implemented and are ready to use.

- **✅ Issue #1: Implement User & Role Test Fixtures** _(Completed: PR #54, merged 2025-11-18)_
    - **Title:** `feat(test): create advanced test fixtures for users and roles`
    - **Description:** Implement the `createTestAdminUser` and `createTestUserWithRole` helper functions in `test/utils/fixtures.ts` as described in the "Advanced Test Fixtures" section of the [Phase 3 Implementation Guide](vibes/251117_phase3-implementation-guide.md). These fixtures will be crucial for setting up various authorization and role-based access control scenarios.
    - **PR Scope:** Add the new fixtures to `test/utils/fixtures.ts` and include basic tests to ensure their correct functionality.
    - **Outcome:** Implemented with 18 comprehensive tests. Both functions accept email/username/password options. Smart role reuse prevents role proliferation. Total test count: 145 passing.

- **✅ Issue #2: Implement Family Test Fixtures** _(Completed: PR #55, merged 2025-11-18)_
    - **Title:** `feat(test): create advanced test fixtures for families`
    - **Description:** Implement the `createFamilyWithMembers` and `createComplexFamily` fixtures in `test/utils/fixtures.ts`. These will streamline the creation of families with diverse member structures and roles, essential for testing cross-family access and role-based permissions.
    - **PR Scope:** Add the new family-related fixtures to `test/utils/fixtures.ts` and verify their functionality.
    - **Outcome:** Implemented with 14 comprehensive tests. `createFamilyWithMembers` accepts creator and optional members/managers/name parameters. `createComplexFamily` auto-generates creator with defaults (1 manager + 2 members). Both return categorized arrays. Creator added as manager but not included in returned member arrays. Total test count: 159 passing.

- **✅ Issue #3: Implement Session & Token Test Fixtures** _(Completed: PR #56, merged 2025-11-18)_
    - **Title:** `feat(test): create advanced test fixtures for sessions and tokens`
    - **Description:** Implement the `createExpiredInvitation`, `createValidInvitation`, and `createUsedInvitation` fixtures in `test/utils/fixtures.ts`. These are vital for thoroughly testing session management and token security, including expiration and reuse prevention.
    - **PR Scope:** Add the new token-related fixtures to `test/utils/fixtures.ts` and ensure they behave as expected.
    - **Outcome:** Implemented with 21 comprehensive tests. `createValidInvitation` creates pending invitations with future expiration (default 7 days). `createExpiredInvitation` creates pending invitations with past expiration (default 1 day ago). `createUsedInvitation` creates invitations with non-pending status (accepted, declined, expired, cancelled, default: accepted). All use `randomUUID()` for secure token generation and timestamp-based email uniqueness. Total test count: 180 passing. **Part 1 (Foundational Work) of Phase 3 is now complete.**

---

## Part 2: Authorization Testing (Per Service)

This part will implement comprehensive authorization tests, broken down by individual service to ensure focused development and review. Refer to the "Authorization Testing" section of the [Phase 3 Implementation Guide](vibes/251117_phase3-implementation-guide.md) for detailed patterns and categories.

- **✅ Issue #4: Authorization Tests for Family Service** _(Completed: PR #57, merged 2025-11-18)_
    - **Title:** `test(security): add authorization tests for families service`
    - **Description:** Implement all authorization test categories (unauthenticated access, insufficient permissions, resource ownership, role-based access, and cross-family access prevention) for the `server/services/families.ts` service.
    - **PR Scope:** Add a new `describe("Authorization", ...)` block within `test/nuxt/services/families.spec.ts` containing all relevant authorization tests.
    - **Outcome:** Implemented with 12 comprehensive authorization tests (+436 lines). Test categories: Unauthenticated Access (3 tests - empty/null/undefined userId), Insufficient Permissions (2 tests - member/manager cannot transfer), Resource Ownership (2 tests - non-creator blocked), Cross-Family Access Prevention (2 tests - multi-tenant isolation), Role-Based Access (1 test - creator-only operations), Business Rule Validation (2 tests - new owner must be member). Tests cover `createFamily` and `transferOwnership` with proper error types (UnauthorizedError, ForbiddenError, ValidationError). Total test count: 192 passing.

- **✅ Issue #5: Authorization Tests for Invitation Service** _(Completed: PR #59, Issue #48, merged 2025-11-19)_
    - **Title:** `test(security): add authorization tests for invitations service`
    - **Description:** Implement authorization tests for the `server/services/invitations.ts` service, focusing on ensuring that only authorized users (e.g., family managers) can create, accept, or decline invitations.
    - **PR Scope:** Add authorization tests to `test/nuxt/services/invitations.spec.ts`.
    - **Outcome:** Implemented with 5 comprehensive authorization tests. Test categories: manager-only operations, regular member prevention, non-member prevention, conflict prevention (existing members). Follow-up commit (b6da223f) added authentication check (`UnauthorizedError` for unauthenticated users) and improved test fixtures with counters to prevent race conditions. Total authorization tests: 10 (5 in services + 5 in API tests). All tests passing.

- **✅ Issue #6: Authorization Tests for Admin Services (Users & Roles)** _(Completed: Issue #49, merged 2025-11-19)_
    - **Title:** `test(security): add authorization tests for admin (users, roles) services`
    - **Description:** Implement authorization tests for `server/services/users.ts` and `server/services/roles.ts` services, verifying that only users with appropriate administrative roles can perform user and role management operations.
    - **PR Scope:** Add authorization tests to `test/nuxt/services/users.spec.ts` and `test/nuxt/services/roles.spec.ts`.
    - **Outcome:** Implemented with 12 comprehensive authorization tests (6 for users, 6 for roles). Added admin-only authorization to `getAllUsersWithRoles`, `createUser`, `getAllRoles`, and `createRole` service functions. Test categories: admin-only access, non-admin prevention, unauthenticated prevention. Uses `UnauthorizedError` for unauthenticated and `ForbiddenError` for non-admin users. Refactored API handlers to use updated services. Follow-up commit (6cb936c1) extracted `isAdmin()` helper to `server/lib/authorization.ts` to eliminate code duplication and documented authorization patterns. All 22 authorization tests passing. **Part 2 (Authorization Testing) of Phase 3 is now complete.**

---

## Part 3: Input Validation Testing (Per Service)

This section focuses on adding robust input validation tests to protect against various attack vectors and ensure data integrity. Refer to the "Input Validation Testing" section of the [Phase 3 Implementation Guide](vibes/251117_phase3-implementation-guide.md).

- **✅ Issue #7: Input Validation Tests for User-Facing Services** _(Completed: PR #60, Issue #50, merged 2025-11-19)_
    - **Title:** `test(security): add input validation tests for families and users services`
    - **Description:** Implement input validation tests for services that directly handle user-provided input, such as `server/services/families.ts` and `server/services/users.ts`. This includes testing for SQL injection payloads, XSS script injection, invalid data formats (e.g., malformed UUIDs, emails), and boundary values (e.g., empty strings, extremely long strings, special characters).
    - **PR Scope:** Add `describe("Input Validation", ...)` blocks to `test/nuxt/services/families.spec.ts` and `test/nuxt/services/users.spec.ts`.
    - **Outcome:** Implemented with 13 comprehensive input validation tests (2 families + 11 users). **Families service:** validates family name not empty and max 100 chars. **Users service:** validates email format/presence/max 255 chars, username alphanumeric/-/\_/length 3-50 chars, password presence/min 8/max 128 chars. All validations throw `ValidationError`. Code review identified and fixed critical password validation bug (redundant checks with wrong error message). Test assertions updated from string to class comparison for type safety. All 230 tests passing. Input validation pattern established: early validation before business logic, clear error messages, security-focused (DoS prevention via length limits, basic injection prevention via format checks). **Note:** XSS sanitization and additional services (invitations, auth, roles) deferred to future work.

---

## Part 4: Thematic Testing Categories

These categories represent cohesive units of work that can be implemented in single, focused issues.

- **Issue #8: Concurrency Testing**
    - **Title:** `test(security): add concurrency tests for unique constraints and race conditions`
    - **Description:** Implement all concurrency tests as described in the "Concurrency Testing" section of the [Phase 3 Implementation Guide](vibes/251117_phase3-implementation-guide.md). This includes verifying unique constraint enforcement (e.g., duplicate email/username registration) and handling of simultaneous operations to prevent race conditions.
    - **PR Scope:** A new test file or suite dedicated to concurrency scenarios, or additions to existing relevant service test files.

- **Issue #9: Session Management Testing**
    - **Title:** `test(security): add session management tests for token flows`
    - **Description:** Implement all session management tests as outlined in the "Session Management Testing" section of the [Phase 3 Implementation Guide](vibes/251117_phase3-implementation-guide.md). This covers the email verification flow, invitation token generation and validation, token expiration handling, and prevention of token reuse.
    - **PR Scope:** Add tests to `test/nuxt/services/auth.spec.ts` and `test/nuxt/services/invitations.spec.ts` related to token security and session management.

---

## Part 5: Edge Case Testing

This final part ensures the application handles unusual inputs and boundary conditions gracefully. Refer to the "Edge Case Testing" section of the [Phase 3 Implementation Guide](vibes/251117_phase3-implementation-guide.md).

- **Issue #10: Edge Case Tests for All Services**
    - **Title:** `test(robustness): add edge case tests for all services`
    - **Description:** Implement tests for various edge cases across all relevant services. This includes handling non-existent resource IDs, operations on deleted or soft-deleted resources, behavior with empty collections, and support for Unicode and special characters in inputs.
    - **PR Scope:** Add `describe("Edge Cases", ...)` blocks to relevant service test files (e.g., `families.spec.ts`, `users.spec.ts`, `invitations.spec.ts`).

---

This detailed breakdown provides a clear, actionable plan for completing Phase 3 of the test refactoring, ensuring each step is manageable and contributes to a more secure and robust application.
