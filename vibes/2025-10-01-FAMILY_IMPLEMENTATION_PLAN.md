## Extensive Step-by-Step Implementation Plan for Family Feature

This plan breaks down the implementation into logical phases and steps, detailing the chosen solutions, exploring alternatives, weighing pros and cons, and identifying necessary clarifications. For each step, validation and automated testing strategies are explicitly included.

---

### Phase 1: Setup & Core Data Model

This phase establishes the foundational database schema and basic API interactions for families.

**Step 1.1: Database Schema Updates (Drizzle ORM)**

- **Goal:** Implement the `families`, `familyMembers`, and `familyInvitations` tables in `server/db/schema.ts` using Drizzle ORM, and generate the corresponding migration.
- **Chosen Solution:** Define Drizzle schemas for `families`, `familyMembers`, and `familyInvitations` using `pgTable`, `uuid`, `text`, `timestamp`, `boolean`, `primaryKey`, `foreignKey`, `unique` for constraints. Generate migration using `pnpm db:generate` and apply with `pnpm db:migrate`.
- **Validation:**
    - **Drizzle Schema Constraints:** `notNull`, `unique`, `primaryKey`, `foreignKey` constraints defined directly in the Drizzle schema will enforce database-level validation and referential integrity.
    - **Type Validation:** Drizzle's type inference ensures that the schema definition is type-safe within TypeScript.
- **Testing:**
    - **Unit Tests (Schema Definition):** Write tests to ensure the Drizzle schema definitions are correct and match expectations (e.g., table names, column types, constraints). This can involve inspecting the generated TypeScript types or Drizzle's schema objects.
    - **Integration Tests (Migration):** After generating the migration, run the migration against a test database (e.g., a Dockerized PostgreSQL instance). Verify that the tables are created with the correct columns, types, and constraints. This can be done by querying the `information_schema` or by attempting to insert/update data that should pass/fail validation.
- **Critical Self-Reflection:** Database-level constraints are the first line of defense for data integrity. Testing the migration ensures the schema is correctly applied.
- **Clarifications Needed:**
    - **UUID Generation Strategy:** Application-generated (e.g., `crypto.randomUUID()`) or database-generated (`gen_random_uuid()`)? _Assumption: Application-generated for flexibility._
    - **Default Values:** Confirm `createdAt` and `updatedAt` use Drizzle's `default` and `onUpdate` functions for `now()`.
    - **`familyMembers.role` Enum:** PostgreSQL `ENUM` type or `text` field with application-level validation? _Assumption: `text` with Zod validation for flexibility._

**Step 1.2: Basic API Endpoints for Family Creation & Retrieval**

- **Goal:** Implement `POST /api/families` (create family) and `GET /api/families` (list user's families) endpoints.
- **Chosen Solution:** Create `server/api/families/index.post.ts` and `server/api/families/index.get.ts`. Use Zod for request body validation. Utilize Drizzle ORM to interact with the `families` and `familyMembers` tables. For `POST`, create a new `family` record, and a `familyMember` record for the creator with `role: 'manager'`. For `GET`, query `familyMembers` to find families the authenticated user belongs to, then join with `families` to retrieve details. Implement basic authentication checks (user must be logged in).
- **Validation:**
    - **Zod Schema Validation:** Define a Zod schema for the `POST /api/families` request body (e.g., `z.object({ name: z.string().min(1).max(50) })`). This ensures the `name` field meets business rules (e.g., not empty, max length).
    - **Authentication Check:** Verify `event.context.user` exists.
    - **Business Logic Validation:** For `POST`, check for duplicate family names (if `name` is unique).
- **Testing:**
    - **Unit Tests (Zod Schema):** Test the Zod schema in isolation to ensure it correctly validates valid and invalid inputs.
    - **Integration Tests (API Endpoints - Nuxt Environment):**
        - **`POST /api/families`:**
            - Test with valid `name` (expect 201 Created, family and member records in DB).
            - Test with invalid `name` (empty, too long) (expect 400 Bad Request).
            - Test with duplicate `name` (expect 409 Conflict).
            - Test unauthenticated access (expect 401 Unauthorized).
            - Verify `familyMember` record is created with `role: 'manager'` for the creator.
        - **`GET /api/families`:**
            - Test unauthenticated access (expect 401 Unauthorized).
            - Test authenticated user with no families (expect 200 OK, empty array).
            - Test authenticated user with one or more families (expect 200 OK, correct family data).
            - Test that only families the user is a member of are returned.
    - **End-to-End Tests (Optional but Recommended):** Simulate a user creating a family and then viewing their list of families through the UI.
- **Critical Self-Reflection:** Zod provides robust API input validation. Comprehensive integration tests are crucial for verifying both happy paths and error conditions, including authentication and business logic.
- **Clarifications Needed:**
    - **Error Handling for Duplicate Family Names:** What should happen if a user tries to create a family with a name that already exists (given `name` is unique)? _Assumption: Return a 409 Conflict error with a descriptive message._
    - **User Context:** Confirm `nuxt-auth-utils` provides authenticated user ID via `event.context.user`.

---

### Phase 2: Invitation System

This phase builds out the invitation functionality.

**Step 2.1: Invitation Data Model & Service**

- **Goal:** Ensure the `familyInvitations` table is correctly defined and a service layer exists for managing invitation logic.
- **Chosen Solution:** The `familyInvitations` Drizzle schema is already defined in Step 1.1. Create a `server/services/invitationService.ts` (or similar) to encapsulate logic for: generating unique `invitationToken`, creating invitation records, updating invitation status, and checking invitation validity.
- **Validation:**
    - **Drizzle Schema Constraints:** `notNull`, `unique` for `invitationToken`, `foreignKey` for `familyId` and `invitedByUserId`.
    - **Service-level Validation:** The `invitationService` will validate the `invitationToken` (format, existence, expiry, status) before allowing acceptance/declination.
- **Testing:**
    - **Unit Tests (Service Logic):** Test `invitationService` methods in isolation:
        - `generateInvitationToken()`: Ensure it returns a valid, unique token.
        - `createInvitation()`: Test successful creation, and handling of invalid input (e.g., non-existent `familyId`).
        - `updateInvitationStatus()`: Test status transitions (pending -> accepted, pending -> declined), and invalid transitions.
        - `getInvitationByToken()`: Test retrieval of valid/invalid/expired tokens.
        - `isValidInvitation()`: Test various scenarios (valid, expired, already accepted/declined).
- **Critical Self-Reflection:** Encapsulating logic in a service and thoroughly unit testing it is crucial for the reliability and security of the invitation system.
- **Clarifications Needed:**
    - **Invitation Token Length/Format:** Standard UUID or shorter? _Assumption: Standard UUID for security._
    - **Invitation Expiry:** Default duration (e.g., 7 days)? _Assumption: 7 days, configurable._

**Step 2.2: Email Integration for Invitations**

- **Goal:** Set up an email sending mechanism to deliver invitation links to invited users.
- **Chosen Solution:** Utilize a Node.js email library (e.g., Nodemailer) with a transactional email service (e.g., SendGrid). Create a `server/utils/emailSender.ts` utility to abstract email sending. The email content will include a link with the `invitationToken`.
- **Validation:**
    - **Email Format Validation:** Ensure `invitedEmail` is a valid email format before attempting to send. (This will be done at the API level, but the `emailSender` should also handle potential errors from the email service).
    - **Email Service Response Handling:** The `emailSender` should handle success/failure responses from the transactional email service.
- **Testing:**
    - **Unit Tests (Email Sender):**
        - Test `sendInvitationEmail()` with valid inputs (mocking the email service API call). Expect success.
        - Test `sendInvitationEmail()` with invalid email format (expect failure/error handling).
        - Test error handling when the email service fails (e.g., network error, invalid API key).
    - **Integration Tests (Manual/Staging):** For critical email flows, manual testing in a staging environment is often necessary to verify actual email delivery and content. Automated tests can mock the external service.
- **Critical Self-Reflection:** Thorough testing of email sending is vital, as it's an external dependency. Mocking the external service for unit tests is key to fast, reliable tests.
- **Clarifications Needed:**
    - **Chosen Email Service Provider:** SendGrid, Mailgun, AWS SES? _Assumption: SendGrid._
    - **Email Template:** Content and styling? _Assumption: Basic text/HTML template._
    - **Base URL for Invitation Link:** Confirm `NUXT_PUBLIC_APP_BASE_URL` environment variable.

**Step 2.3: API Endpoints for Sending, Accepting, Declining Invitations**

- **Goal:** Implement the API endpoints for managing the invitation lifecycle.
- **Chosen Solution:**
    - `POST /api/families/:familyId/invitations` (Send Invitation): Authenticate user, authorize as family manager, validate `invitedEmail`, use `invitationService` to create invitation, use `emailSender` to send email.
    - `GET /api/invitations` (List User's Invitations): Authenticate user, query `familyInvitations` where `invitedEmail` matches authenticated user's email and `status` is 'pending'.
    - `POST /api/invitations/:invitationToken/accept` (Accept Invitation): Authenticate user, use `invitationService` to validate token and update status to 'accepted', create `familyMember` record. Ensure `invitedEmail` matches authenticated user's email.
    - `POST /api/invitations/:invitationToken/decline` (Decline Invitation): Authenticate user, use `invitationService` to validate token and update status to 'declined'. Ensure `invitedEmail` matches authenticated user's email.
    - `DELETE /api/families/:familyId/invitations/:invitationId` (Revoke Invitation - for manager): Authenticate user, authorize as family manager, use `invitationService` to update status to 'revoked'.
- **Validation:**
    - **Zod Schema Validation:** For `POST /api/families/:familyId/invitations`, validate `invitedEmail` format.
    - **Authentication & Authorization:** Middleware/guards to ensure user is authenticated and authorized (manager for sending/revoking, correct invitee for accept/decline).
    - **Business Logic Validation:**
        - `POST /api/families/:familyId/invitations`: Check if `familyId` exists, if `invitedEmail` is already a member, if an invitation already exists for that email/family.
        - `POST /api/invitations/:invitationToken/accept/decline`: `invitationService` handles token validity (existence, expiry, status), and ensures `invitedEmail` matches authenticated user's email.
- **Testing:**
    - **Integration Tests (API Endpoints - Nuxt Environment):**
        - **`POST /api/families/:familyId/invitations`:**
            - Test unauthenticated (401), unauthorized (403 - non-manager).
            - Test with invalid `familyId` (404).
            - Test with invalid `invitedEmail` (400).
            - Test inviting an already existing member (409 Conflict).
            - Test inviting a user who already has a pending invitation (409 Conflict).
            - Test successful invitation (201 Created, verify DB record, mock email sender).
        - **`GET /api/invitations`:**
            - Test unauthenticated (401).
            - Test authenticated user with no invitations (200, empty array).
            - Test authenticated user with pending invitations (200, correct data).
        - **`POST /api/invitations/:invitationToken/accept`:**
            - Test unauthenticated (401).
            - Test with invalid/expired/already-used token (400/404).
            - Test authenticated user whose email doesn't match `invitedEmail` (403).
            - Test successful acceptance (200, verify `familyMember` created, `invitation` status updated).
        - **`POST /api/invitations/:invitationToken/decline`:** Similar tests to accept, verifying status update.
        - **`DELETE /api/families/:familyId/invitations/:invitationId`:**
            - Test unauthenticated (401), unauthorized (403 - non-manager).
            - Test with invalid `familyId`/`invitationId` (404).
            - Test successful revocation (200, verify `invitation` status updated).
- **Critical Self-Reflection:** This is the most complex part of the invitation system. Thorough testing of all paths, especially edge cases and security-related scenarios, is paramount.
- **Clarifications Needed:**
    - **Invitation Revocation UI:** Will there be a UI for managers to revoke? _Assumption: Yes, on family dashboard._
    - **Error Handling for Invalid/Expired Tokens:** Specific error messages/codes (e.g., 400/404)? _Assumption: 400/404 with clear messages._

---

### Phase 3: Member Management

This phase allows family managers to view and manage members.

**Step 3.1: API Endpoints for Listing & Removing Members**

- **Goal:** Implement `GET /api/families/:familyId/members` (list members) and `DELETE /api/families/:familyId/members/:userId` (remove member) endpoints.
- **Chosen Solution:**
    - `GET /api/families/:familyId/members`: Authenticate user, authorize user as a member of `familyId`. Query `familyMembers` for `familyId`, join with `users` table to get member details (e.g., name, email).
    - `DELETE /api/families/:familyId/members/:userId`: Authenticate user, authorize user as _manager_ of `familyId`. Prevent manager from removing themselves. Delete the corresponding `familyMember` record.
- **Validation:**
    - **Authentication & Authorization:** Middleware/guards to ensure user is authenticated and authorized (member for `GET`, manager for `DELETE`).
    - **Parameter Validation:** Validate `familyId` and `userId` are valid UUIDs.
    - **Business Logic Validation:**
        - `DELETE`: Check if `familyId` exists. Check if `userId` is actually a member of `familyId`. Prevent manager from removing themselves (unless a transfer mechanism is in place).
- **Testing:**
    - **Integration Tests (API Endpoints - Nuxt Environment):**
        - **`GET /api/families/:familyId/members`:**
            - Test unauthenticated (401), unauthorized (403 - not a member of the family).
            - Test with invalid `familyId` (404).
            - Test authenticated member of family (200 OK, correct member list).
            - Test that sensitive user data (e.g., hashed passwords) is not returned.
        - **`DELETE /api/families/:familyId/members/:userId`:**
            - Test unauthenticated (401), unauthorized (403 - not manager of family).
            - Test with invalid `familyId` or `userId` (404).
            - Test removing a user who is not a member of the family (404 or 400).
            - Test manager attempting to remove themselves (expect 400 Bad Request).
            - Test successful removal (200 OK, verify `familyMember` record is deleted from DB).
- **Critical Self-Reflection:** Authorization is paramount here. The self-removal prevention is a critical business rule that must be tested.
- **Clarifications Needed:**
    - **Manager Self-Removal Policy:** Prevent it with an error message, or require a manager transfer first? _Assumption: Prevent it with an error for now._
    - **Impact of Member Removal on Assets:** If a member is removed, what happens to the assets they created within that family? _Assumption: Assets remain with the family, but the removed user loses access. The `creatorId` on the asset would still point to the removed user, which is acceptable._

**Step 3.2: Frontend Integration for Member Management**

- **Goal:** Create UI components on the family dashboard to display members and allow managers to remove them.
- **Chosen Solution:** On the `/families/:id` page, implement a `FamilyMembersList.vue` component. This component will: fetch members using `useFamilyStore.fetchFamilyMembers`, display each member's name/email, conditionally display a "Remove" button next to each member (excluding themselves) for managers, implement a confirmation dialog before removing a member, call `useFamilyStore.removeMember` action, and update the UI reactively.
- **Validation:**
    - **Client-side Authorization:** `v-if` directives to hide "Remove" button from non-managers.
    - **Confirmation Dialog:** User confirmation before executing a destructive action.
- **Testing:**
    - **Unit Tests (Vue Component - Vitest/Nuxt Test Utils):**
        - Test `FamilyMembersList.vue` renders correctly with a list of members.
        - Test that "Remove" button is visible only for managers.
        - Test that "Remove" button is disabled/hidden for the manager themselves.
        - Test that clicking "Remove" button triggers a confirmation dialog.
        - Test that confirming removal calls the `removeMember` action in the store.
    - **End-to-End Tests (Cypress/Playwright):**
        - Log in as a manager, navigate to family dashboard.
        - Verify "Remove" buttons are present for other members.
        - Click "Remove", confirm dialog, verify member is removed from UI.
        - Log in as a non-manager, navigate to family dashboard.
        - Verify "Remove" buttons are not present.
- **Critical Self-Reflection:** Frontend tests are crucial for ensuring the UI behaves as expected, especially regarding conditional rendering and user interaction flows for destructive actions.
- **Clarifications Needed:**
    - **Member Display Details:** What specific user information should be displayed for each member (e.g., name, email, join date)? _Assumption: Name and email._

---

### Phase 4: Shared Asset Integration

This phase adapts existing shared assets to be family-associated.

**Step 4.1: Updating Shared Asset Data Models**

- **Goal:** Add a `familyId` foreign key to the `calendars`, `toDoLists`, and `corkboards` tables.
- **Chosen Solution:** Modify the Drizzle schemas for `calendars`, `toDoLists`, and `corkboards` in `server/db/schema.ts` to include a nullable `familyId` column (UUID, foreign key to `families.id`). Generate and apply a new database migration.
- **Validation:**
    - **Drizzle Schema Constraints:** `foreignKey` constraint to `families.id` ensures that if a `familyId` is provided, it must refer to an existing family. `nullable` allows for personal assets.
    - **Type Validation:** Drizzle's type inference ensures type safety.
- **Testing:**
    - **Unit Tests (Schema Definition):** Verify the Drizzle schema definitions for asset tables correctly include the `familyId` column and its foreign key constraint.
    - **Integration Tests (Migration):** Run the migration against a test database. Verify that the `familyId` column is added to the asset tables with the correct type and foreign key constraint. Test inserting assets with and without a `familyId` to ensure the nullable constraint works.
- **Critical Self-Reflection:** Database-level foreign keys are crucial for maintaining data integrity between families and their assets.
- **Clarifications Needed:**
    - **Existing Personal Assets:** What is the strategy for existing personal assets? Should they remain personal, or is there a migration path to associate them with a family? _Assumption: They remain personal, and the `familyId` column will be `NULL` for them._

**Step 4.2: Updating Shared Asset APIs for Family Context**

- **Goal:** Modify existing API endpoints for calendars, to-do lists, and corkboards to support `familyId` and enforce family-based authorization.
- **Chosen Solution:**
    - **Creation Endpoints (`POST /api/calendars`, etc.):** Allow an optional `familyId` in the request body. If `familyId` is provided, authorize the authenticated user as a _member_ of that family. If `familyId` is not provided, the asset is created as a personal asset for the authenticated user.
    - **Retrieval Endpoints (`GET /api/calendars`, `GET /api/calendars/:id`, etc.):** Modify queries to filter by `familyId` (if provided in query params or path) or by `userId` (for personal assets). Enforce authorization: If `familyId` is present, the authenticated user must be a member of that family. If `familyId` is `NULL` (personal asset), the `userId` must match the authenticated user's ID. Consider new endpoints like `GET /api/families/:familyId/calendars` for explicit family asset retrieval.
    - **Update/Deletion Endpoints (`PUT /api/calendars/:id`, `DELETE /api/calendars/:id`, etc.):** Before performing the action, retrieve the asset and check its `familyId`. If `familyId` is present, authorize the authenticated user as a _member_ of that family. If `familyId` is `NULL`, authorize the authenticated user as the `creatorId` of the personal asset.
- **Validation:**
    - **Zod Schema Validation:** Update Zod schemas for asset creation/update to include optional `familyId` and validate its format (UUID).
    - **Authentication & Authorization:** Middleware/guards to ensure user is authenticated and authorized based on asset ownership (personal or family membership).
    - **Business Logic Validation:**
        - For family-owned assets: Verify `familyId` exists and user is a member.
        - For personal assets: Verify `creatorId` matches authenticated user.
- **Testing:**
    - **Integration Tests (API Endpoints - Nuxt Environment):**
        - **Creation (`POST`):**
            - Test creating a personal asset (no `familyId`).
            - Test creating a family asset with valid `familyId` (user is member).
            - Test creating a family asset with invalid `familyId` (404).
            - Test creating a family asset where user is not a member (403).
        - **Retrieval (`GET`):**
            - Test retrieving personal assets (only own assets).
            - Test retrieving family assets (only if member of family).
            - Test retrieving a specific asset (personal/family) with correct authorization.
            - Test unauthorized access (401/403).
        - **Update/Deletion (`PUT`/`DELETE`):**
            - Test updating/deleting own personal asset.
            - Test updating/deleting a family asset where user is a member.
            - Test updating/deleting a family asset where user is not a member (403).
            - Test updating/deleting another user's personal asset (403).
- **Critical Self-Reflection:** This step involves significant changes to existing APIs. The authorization logic needs to be meticulously tested for all possible scenarios to prevent data breaches.
- **Clarifications Needed:**
    - **Creator of Family Assets:** When a family member creates an asset for a family, should the `creatorId` on the asset still be the individual user's ID, or should it be the `familyId`? _Assumption: The `creatorId` should remain the individual user's ID, as it tracks who specifically created the item, even if it's for the family._
    - **Deletion of Family Assets:** Should only family managers be able to delete family-owned assets, or any family member? _Assumption: Any family member can delete, but this needs clarification._

---

### Phase 5: Frontend UI/UX

This phase builds user-facing components for families.

**Step 5.1: Family Creation UI**

- **Goal:** Provide a user interface for creating a new family.
- **Chosen Solution:** A dedicated page or modal (`/families/create`) with a simple form containing a single input field for "Family Name". A "Create Family" button. Client-side validation for the family name. Upon successful creation, redirect the user to the newly created family's dashboard (`/families/:id`). Display loading states and error messages.
- **Validation:**
    - **Client-side Form Validation:** Use Vue's reactivity and potentially a validation library (e.g., VeeValidate, Vuelidate) to ensure "Family Name" is not empty and meets length/character constraints before submitting to the API.
    - **API Error Display:** Display error messages returned from the backend (e.g., 400 for invalid input, 409 for duplicate name).
- **Testing:**
    - **Unit Tests (Vue Component - Vitest/Nuxt Test Utils):**
        - Test `FamilyForm.vue` renders correctly.
        - Test input field updates state.
        - Test client-side validation (e.g., empty name shows error message).
        - Test "Create Family" button is disabled when form is invalid.
        - Test that successful form submission calls the `createFamily` action in the store.
        - Test that API errors are displayed correctly.
    - **End-to-End Tests (Cypress/Playwright):**
        - Navigate to `/families/create`.
        - Attempt to submit with empty/invalid name (expect client-side error).
        - Submit with valid name (expect successful creation and redirection).
        - Submit with a name that causes a backend error (e.g., duplicate), expect error message display.
- **Critical Self-Reflection:** Client-side validation improves UX by providing immediate feedback, but server-side validation is the ultimate authority. Both need thorough testing.
- **Clarifications Needed:**
    - **Family Name Constraints:** Are there any specific character limits or allowed characters for family names? _Assumption: Standard text input, with a reasonable length limit (e.g., 50 characters)._

**Step 5.2: Family Dashboard UI**

- **Goal:** Create a central dashboard for a specific family, displaying members, shared assets, and management options.
- **Chosen Solution:** A dynamic route (`/families/:id`) that serves as the family dashboard. Display the family name prominently. Sections/components for: Family Members (`FamilyMembersList.vue`), Shared Calendars, Shared To-Do Lists, Shared Corkboards. Manager-specific actions (e.g., "Invite Member" button) should be conditionally rendered. Display loading states and error messages.
- **Validation:**
    - **Client-side Authorization:** `v-if` directives to conditionally render manager-specific UI elements based on the user's role within the family (fetched from `useFamilyStore`).
    - **Data Presence:** Check if data (members, assets) is available before rendering, display loading/empty states.
- **Testing:**
    - **Unit Tests (Vue Components):**
        - Test `FamilyDashboard.vue` renders family name and main sections.
        - Test conditional rendering of manager actions based on `isManager` state.
        - Test loading and error states for data fetching.
    - **Integration Tests (Vue Components with Store):**
        - Test `FamilyDashboard.vue` correctly fetches and displays data from `useFamilyStore`.
    - \*\*End-to-End Tests (Cypress/Playwright):
        - Log in as manager, navigate to family dashboard, verify manager actions are visible.
        - Log in as member, navigate to family dashboard, verify manager actions are hidden.
        - Verify all sections (members, calendars, etc.) load and display data correctly.
- **Critical Self-Reflection:** Testing conditional rendering is crucial to ensure authorization rules are correctly reflected in the UI, preventing unauthorized actions from even being attempted.
- **Clarifications Needed:**
    - **Asset Display:** How should shared assets be displayed on the dashboard? Just a list of names, or a small preview? _Assumption: A list of names with links to their dedicated pages._

**Step 5.3: Invitation UI (Sending & Receiving)**

- **Goal:** Implement user interfaces for sending invitations and for invited users to accept/decline.
- **Chosen Solution:**
    - **Sending Invitations (Manager):** On the family dashboard (or a modal launched from it), an `InviteMemberForm.vue` component. Input field for "Invitee Email Address". "Send Invitation" button. Client-side validation for email format. Display success/error messages.
    - **Receiving Invitations (Invitee):** A dedicated `/invitations` page. List of `InvitationCard.vue` components, each displaying: family name, inviter's name. "Accept" button, "Decline" button. Confirmation dialogs. Redirect to family dashboard on acceptance. Notification mechanism (badge).
- **Validation:**
    - **Client-side Email Validation:** For `InviteMemberForm.vue`, ensure email format is valid before submission.
    - **API Error Display:** Display error messages from backend (e.g., invalid email, already member, already invited).
    - **Confirmation Dialogs:** For accept/decline actions.
- **Testing:**
    - **Unit Tests (Vue Components):**
        - `InviteMemberForm.vue`: Test email input validation, button states, store action calls, error/success message display.
        - `InvitationCard.vue`: Test rendering invitation details, button states, confirmation dialogs, store action calls.
    - **End-to-End Tests (Cypress/Playwright):**
        - **Sending:** Log in as manager, navigate to family dashboard, open invite form, enter valid/invalid email, submit, verify success/error message.
        - **Receiving:** Log in as invited user, verify notification badge, navigate to `/invitations`. Verify invitation card details. Click "Accept"/"Decline", confirm dialog, verify outcome (redirection, invitation removed).
        - Test edge cases like accepting an expired/invalid invitation.
- **Critical Self-Reflection:** The invitation flow involves multiple user interactions and API calls. E2E tests are particularly valuable here to ensure the entire flow works seamlessly from the user's perspective.
- **Clarifications Needed:**
    - **Inviter's Name:** How will the inviter's name be displayed? Will the `familyInvitations` table store `invitedByUserName` or will it be fetched via `invitedByUserId`? _Assumption: Fetch via `invitedByUserId` from the `users` table._
    - **Notification Mechanism:** What is the preferred way to notify users of new invitations (e.g., a global notification component, a badge on a navigation item)? _Assumption: A badge on a navigation item leading to the `/invitations` page._

---

### Phase 6: Security & Robustness

This phase ensures the feature is secure, reliable, and handles errors gracefully.

**Step 6.1: Authorization Implementation**

- **Goal:** Enforce all authorization rules defined in the architecture, ensuring users can only perform actions and access data they are permitted to.
- **Chosen Solution:** Server-side Middleware/Guards within Nuxt's `server/api` routes. For manager-only actions, check `role === 'manager'`. For member-only access, check if a `familyMember` record exists. For invitation acceptance/declination, verify `invitedEmail` matches authenticated user's email. Frontend conditional rendering for UX.
- **Validation:**
    - **Middleware/Guard Logic:** The authorization logic itself acts as a validation layer, rejecting unauthorized requests.
    - **Input Validation:** Ensure `familyId`, `userId`, `invitationToken` parameters are valid before authorization checks.
- **Testing:**
    - **Unit Tests (Authorization Logic/Middleware):** Test the authorization functions/middleware in isolation with various user roles and resource ownership scenarios.
    - **Integration Tests (API Endpoints - Nuxt Environment):** This is where authorization is most critically tested. For _every_ API endpoint:
        - Test unauthenticated access (expect 401 Unauthorized).
        - Test authenticated but unauthorized access (expect 403 Forbidden).
        - Test authenticated and authorized access (expect 200 OK or appropriate success code).
        - Specifically test edge cases like a non-manager trying to invite, a non-member trying to view family assets, etc.
- **Critical Self-Reflection:** Authorization is a security cornerstone. It must be tested exhaustively at the API level to prevent any bypasses. Frontend tests only verify UI behavior, not security.
- **Clarifications Needed:**
    - **Authorization Error Responses:** What specific HTTP status codes and error messages should be returned for different authorization failures (e.g., 401 Unauthorized vs. 403 Forbidden)? _Assumption: 401 for unauthenticated, 403 for unauthorized (authenticated but no permission)._

**Step 6.2: Logging & Error Handling Enhancements**

- **Goal:** Implement the recommended enhancements for logging and error handling.
- **Chosen Solution:** Server-side Winston logging for significant events (family CRUD, invitation lifecycle, member changes, authorization failures), including `userId`, `familyId`, and other relevant context. Integrate a centralized error tracking service (e.g., Sentry) for both server-side and client-side errors. Ensure all API endpoints return consistent JSON error objects with appropriate HTTP status codes. Implement a global error handling mechanism in the frontend to display user-friendly messages.
- **Validation:**
    - **Error Object Schema:** Define a consistent Zod schema for API error responses to ensure they always conform to a predictable structure.
    - **Log Level Configuration:** Ensure logging levels are correctly configured (e.g., `debug`, `info`, `warn`, `error`) to control verbosity.
- **Testing:**
    - **Unit Tests (Error Handling Utilities):** Test custom error classes, error formatting utilities, and global error handlers in isolation.
    - **Integration Tests (API Endpoints):** For _every_ API endpoint, test various error scenarios (e.g., invalid input, unauthorized access, internal server error) and verify that:
        - The correct HTTP status code is returned.
        - The error response body matches the defined error schema.
        - Relevant errors are logged by Winston.
        - Errors are captured by the error tracking service (mocking the service in tests).
    - **End-to-End Tests (Frontend Error Display):** Simulate API errors and unhandled client-side exceptions to verify that the frontend displays user-friendly messages and that errors are reported to the tracking service.
- **Critical Self-Reflection:** Robust error handling and logging are crucial for application stability and maintainability in production. Testing these aspects ensures that errors are caught, reported, and presented to users gracefully.
- **Clarifications Needed:**
    - **Chosen Error Tracking Service:** Which specific service (e.g., Sentry, Bugsnag) should be integrated? _Assumption: Sentry, due to its popularity and comprehensive features._
    - **Error Reporting Scope:** What level of detail should be sent to the error tracking service (e.g., user data, request body)? _Assumption: Sensitive data should be scrubbed or anonymized before sending._

**Step 6.3: Family Deletion/Disbandment Implementation**

- **Goal:** Implement the revised family deletion strategy (soft delete by default, with a multi-step disbandment process for permanent deletion).
- **Chosen Solution:**
    - `DELETE /api/families/:id` Endpoint Modification: Instead of physically deleting the `family` record, update a `deletedAt` timestamp column in the `families` table. All API queries for families must implicitly filter out soft-deleted families. Frontend UI for "delete family" will trigger this soft-delete.
    - Disbandment Process (Future Feature): For a true permanent deletion, a separate, more involved process will be designed and implemented later.
- **Validation:**
    - **Authorization:** Only family managers can initiate soft deletion.
    - **Business Logic Validation:** Prevent soft-deleting a family that is already soft-deleted.
- **Testing:**
    - **Integration Tests (API Endpoint - Nuxt Environment):**
        - Test unauthenticated (401), unauthorized (403 - non-manager).
        - Test with invalid `familyId` (404).
        - Test successful soft deletion (200 OK, verify `deletedAt` timestamp is set in DB).
        - Test that soft-deleted families are _not_ returned by `GET /api/families` (unless explicitly requested by an admin-level API).
        - Test attempting to soft-delete an already soft-deleted family (expect 400 Bad Request or similar).
    - **End-to-End Tests (Frontend):**
        - Log in as manager, navigate to family dashboard.
        - Click "Delete Family", confirm dialog.
        - Verify family disappears from the list of active families.
- **Critical Self-Reflection:** The soft-delete mechanism is a critical safety feature. Testing that soft-deleted families are correctly filtered from normal queries is as important as testing the deletion itself.
- **Clarifications Needed:**
    - **Soft Delete Indicator:** `deletedAt` timestamp or `isDeleted` boolean? _Assumption: `deletedAt` timestamp, as it provides more context and flexibility for recovery._
    - **Shared Asset Handling on Soft Delete:** When a family is soft-deleted, should its shared assets also be soft-deleted, or just become inaccessible? _Assumption: Assets become inaccessible but are not soft-deleted themselves, as they are linked by `familyId`. When the family is restored, assets become accessible again._

---
