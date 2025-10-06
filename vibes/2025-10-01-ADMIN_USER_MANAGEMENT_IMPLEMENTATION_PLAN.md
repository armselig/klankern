### Implementation Plan: Admin User Management

This plan breaks down the development of the Admin User Management feature into small, commit-sized tasks, following a logical progression from foundational database changes to frontend UI, and finally to refinements, security, and testing.

---

**Phase 1: Setup & Core Database**

- **Step 1.1: Update Drizzle Schema for Users and Roles.**
    - **Task**: Modify `server/db/schema.ts` to include `users`, `roles`, and `user_roles` tables.
        - `users`: `id` (UUID), `email` (String, Unique), `username` (String, Unique), `display_name` (String, Nullable), `password` (String, Hashed), `first_name` (String, Nullable), `last_name` (String, Nullable), `is_active` (Boolean, Default: `true`), `created_at` (Timestamp), `updated_at` (Timestamp).
        - `roles`: `id` (Primary Key), `name` (String, Unique, e.g., 'admin', 'user').
        - `user_roles`: `user_id` (Foreign Key to `users.id`), `role_id` (Foreign Key to `roles.id`), Composite Primary Key (`user_id`, `role_id`).
    - **Reasoning**: This establishes the foundational data model. It's a single, self-contained change to the schema definition, making it easy to review and commit.
    - **Pros**: Clear separation of schema definition; foundational for all subsequent steps.
    - **Cons**: None.

- **Step 1.2: Generate Drizzle Migration for New Schema.**
    - **Task**: Run `pnpm db:generate` to create a new migration file based on the updated `server/db/schema.ts`.
    - **Reasoning**: This generates the necessary SQL to apply the schema changes to the database. It's a distinct action from defining the schema, ensuring proper version control of database changes.
    - **Pros**: Ensures database changes are tracked, reversible, and applied consistently.
    - **Cons**: None.

- **Step 1.3: Apply Drizzle Migration and Seed Initial Roles.**
    - **Task**: Run `pnpm db:migrate`. Then, update `server/db/seed.ts` (or create a new seed script) to insert 'admin' and 'user' roles into the `roles` table.
    - **Reasoning**: Applies the schema changes to the database and populates essential lookup data. Seeding initial roles is a separate logical step from migration, ensuring the system has the necessary role definitions from the start.
    - **Pros**: Database is ready with the new structure and initial essential data; roles are available for assignment.
    - **Cons**: None.

---

**Phase 2: Backend API (CRUD & Core Logic)**

- **Step 2.1: Implement Basic User Listing API (`GET /api/admin/users`).**
    - **Task**: Create `server/api/admin/users/index.get.ts`. Implement basic Drizzle query to fetch all users (including their roles) from the database and return them. Initially, no search, filter, sort, or pagination.
    - **Reasoning**: Establishes the basic endpoint for reading users, verifying the database connection and Drizzle setup for this feature. It's the smallest functional API step.
    - **Pros**: Quick win; verifies basic backend setup and data retrieval.
    - **Cons**: Lacks full functionality, but that's addressed in later steps.

- **Step 2.2: Implement User Creation API (`POST /api/admin/users`).**
    - **Task**: Create `server/api/admin/users/index.post.ts`. Implement Zod validation for new user data (email, username, display_name, password, first_name, last_name). Hash the provided password using `nuxt-auth-utils`. Insert the new user into the database and assign the 'user' role by default.
    - **Reasoning**: Adds core functionality for creating new users. Includes essential validation and secure password handling from the outset. Assigning a default role is a critical part of user creation.
    - **Pros**: Enables adding new users securely and with validation.
    - **Cons**: None.

- **Step 2.3: Implement Get Single User API (`GET /api/admin/users/[id].get.ts`).**
    - **Task**: Create `server/api/admin/users/[id].get.ts` to fetch a single user by their ID, including their associated roles.
    - **Reasoning**: This endpoint is necessary for the frontend's user editing page to pre-populate forms and for displaying detailed user information.
    - **Pros**: Supports detailed user view and pre-filling edit forms.
    - **Cons**: None.

- **Step 2.4: Implement User Update API (`PUT /api/admin/users/[id].put.ts`).**
    - **Task**: Create `server/api/admin/users/[id].put.ts`. Implement Zod validation for update data. Update user details (email, username, display_name, first_name, last_name, `is_active` status, and roles) in the database.
    - **Reasoning**: Provides the core functionality for modifying existing user accounts, including their roles.
    - **Pros**: Allows comprehensive modification of existing users.
    - **Cons**: None.

- **Step 2.5: Implement User Deactivation/Activation API (`PUT /api/admin/users/[id]/status.put.ts`).**
    - **Task**: Create `server/api/admin/users/[id]/status.put.ts`. This endpoint will accept a payload to update the `is_active` status of a user.
    - **Reasoning**: Provides a distinct API for managing user activity status, separate from general user updates, which can have different authorization rules or logging requirements.
    - **Pros**: Enables toggling user activity without full user update; clear API intent.
    - **Cons**: None.

- **Step 2.6: Implement User Password Reset API (`POST /api/admin/users/[id]/reset-password.post.ts`).**
    - **Task**: Create `server/api/admin/users/[id]/reset-password.post.ts`. This endpoint will accept a new password from the admin, hash it using `nuxt-auth-utils`, and update the user's password in the database.
    - **Reasoning**: Implements the MVP password reset functionality as clarified by the user.
    - **Pros**: Admin can manually reset user passwords for immediate support.
    - **Cons**: Lacks a proper user-facing password reset flow, but this is noted as a future to-do.

- **Step 2.7: Implement User Deletion API (`DELETE /api/admin/users/[id].delete.ts`).**
    - **Task**: Create `server/api/admin/users/[id].delete.ts`. Perform a hard delete of the user record and any associated `user_roles` records from the database.
    - **Reasoning**: Completes the core CRUD operations. The permanent deletion aligns with the MVP clarification.
    - **Pros**: Enables permanent user removal as per requirements.
    - **Cons**: Permanent deletion means data is unrecoverable, but this is an explicit MVP decision.

---

**Phase 3: Frontend (UI & State Management)**

- **Step 3.1: Create Admin Layout and Navigation.**
    - **Task**: Ensure `app/layouts/default.vue` (or create a new `admin.vue` layout) includes a navigation link to `/admin/users`.
    - **Reasoning**: Provides the entry point for the admin user to access the new feature.
    - **Pros**: Basic navigation in place; user can access the page.
    - **Cons**: None.

- **Step 3.2: Create Pinia Store for Admin User Management (`app/stores/admin/users.ts`).**
    - **Task**: Define the initial state (e.g., `users` array, `loading` status, `error` object), getters, and actions for fetching users.
    - **Reasoning**: Centralizes state management and business logic for the admin user feature, adhering to the architectural decision.
    - **Pros**: Clear separation of concerns; foundation for robust state management.
    - **Cons**: Initial boilerplate setup.

- **Step 3.3: Create Admin User List Page (`app/pages/admin/users/index.vue`).**
    - **Task**: Create the basic page structure. Use the Pinia store action to fetch users and display them in a simple list or table. Initially, no search, filter, sort, or pagination UI.
    - **Reasoning**: Provides the core UI for displaying users, verifying the frontend's ability to consume the backend API via the store.
    - **Pros**: Visual representation of users; verifies basic frontend-backend integration.
    - **Cons**: Lacks full interactive functionality, which will be added incrementally.

- **Step 3.4: Create User Form Component (`app/components/admin/user-form.vue`).**
    - **Task**: Develop a reusable Vue component that includes input fields for user details (email, username, display_name, first_name, last_name) and a mechanism for selecting roles.
    - **Reasoning**: This component will be used for both creating new users and editing existing ones, reducing code duplication and ensuring consistency.
    - **Pros**: Reusable component; consistent UI for user input.
    - **Cons**: None.

- **Step 3.5: Create User Create Page (`app/pages/admin/users/create.vue`).**
    - **Task**: Create this page and integrate the `user-form.vue` component. Implement logic to dispatch a Pinia store action to create a new user when the form is submitted.
    - **Reasoning**: Enables the creation of new user accounts directly from the admin UI.
    - **Pros**: Functional user creation from the frontend.
    - **Cons**: None.

- **Step 3.6: Create User Edit Page (`app/pages/admin/users/[id].vue`).**
    - **Task**: Create this page. Fetch the specific user's data by ID (using a Pinia store action), populate the `user-form.vue` component with the fetched data, and implement logic to dispatch a Pinia store action to update the user when the form is submitted.
    - **Reasoning**: Enables the modification of existing user accounts from the admin UI.
    - **Pros**: Functional user editing from the frontend.
    - **Cons**: None.

- **Step 3.7: Implement User Actions (Deactivate/Activate, Reset Password, Delete) in UI.**
    - **Task**: Add buttons or menu items to `app/components/admin/user-actions.vue` (or directly within the user list/edit pages) to trigger deactivation/activation, password reset, and deletion actions. These actions will dispatch corresponding Pinia store actions, which in turn call the backend APIs.
    - **Reasoning**: Completes the core management actions in the UI, providing a full set of tools for admin users.
    - **Pros**: Full management capabilities from the UI.
    - **Cons**: None.

---

**Phase 4: Refinements & Enhancements (Frontend & Backend)**

- **Step 4.1: Implement Search Functionality (Frontend & Backend).**
    - **Task**: Add a search input field to `app/components/admin/user-filter.vue`. Update the Pinia store to manage the search term. Modify the `GET /api/admin/users` endpoint to accept a `_q` query parameter and perform a comprehensive search across all relevant user fields (email, username, display_name, first_name, last_name, roles) using `OR` conditions in the Drizzle query.
    - **Reasoning**: Significantly improves the usability of the user list by allowing admins to quickly find specific users.
    - **Pros**: Enhanced user experience; efficient user lookup.
    - **Cons**: Can be complex to optimize for very large datasets, but acceptable for MVP.

- **Step 4.2: Implement Sorting Functionality (Frontend & Backend).**
    - **Task**: Add sortable headers (e.g., clickable column titles) to `app/components/admin/user-list.vue`. Update the Pinia store to manage the current sort criteria (`_sort`, `_order`). Modify the `GET /api/admin/users` endpoint to accept these parameters and apply Drizzle sorting, with `id` ascending as the default.
    - **Reasoning**: Allows admins to organize and analyze the user list according to different criteria, improving data readability and management.
    - **Pros**: Better data presentation and analysis capabilities.
    - **Cons**: None.

- **Step 4.3: Implement Pagination Functionality (Frontend & Backend).**
    - **Task**: Add pagination controls (e.g., page numbers, next/previous buttons) to `app/pages/admin/users/index.vue`. Update the Pinia store to manage the current page (`_page`) and items per page (`_limit`). Modify the `GET /api/admin/users` endpoint to accept these parameters and apply Drizzle `LIMIT` and `OFFSET` clauses, with a default limit of 50 items per page.
    - **Reasoning**: Essential for handling large user lists efficiently, preventing overwhelming the UI and improving performance.
    - **Pros**: Prevents UI overload; improves performance for large datasets.
    - **Cons**: None.

- **Step 4.4: Implement Filtering Functionality (Frontend & Backend).**
    - **Task**: Add filter options (e.g., a dropdown to filter by `is_active` status) to `app/components/admin/user-filter.vue`. Update the Pinia store to manage filter parameters. Modify the `GET /api/admin/users` endpoint to accept filter parameters and apply corresponding `WHERE` clauses in the Drizzle query.
    - **Reasoning**: Allows admins to narrow down user lists based on specific criteria, making targeted management easier.
    - **Pros**: Targeted user management; improved data relevance.
    - **Cons**: None.

---

**Phase 5: Security & Logging**

- **Step 5.1: Implement Admin Authorization Middleware for API Endpoints.**
    - **Task**: Create a Nitro middleware (or use `defineEventHandler` with explicit checks) and apply it to all `/api/admin/users/*` endpoints. This middleware will verify that the authenticated user has the 'admin' role before allowing access.
    - **Reasoning**: This is a critical security measure to protect sensitive administrative functionalities from unauthorized access.
    - **Pros**: Protects sensitive admin APIs; enforces role-based access control.
    - **Cons**: None.

- **Step 5.2: Integrate Winston Logging into Backend API Actions.**
    - **Task**: Add Winston logging calls to all significant backend actions within the `/api/admin/users/` routes. This includes user creation, update, deletion, password reset attempts, and authorization failures.
    - **Reasoning**: Provides an essential audit trail for administrative actions, crucial for security, compliance, and debugging.
    - **Pros**: Improved observability, security auditing, and debugging capabilities.
    - **Cons**: None.

---

**Phase 6: Testing**

- **Step 6.1: Write Unit Tests for Backend API Endpoints.**
    - **Task**: Create test files (e.g., `test/nuxt/api/admin/users.spec.ts`) to write unit and integration tests for each API endpoint (CRUD, password reset, status update). These tests should cover correct functionality, input validation, and authorization checks.
    - **Reasoning**: Ensures the backend logic is robust, secure, and functions as expected under various conditions.
    - **Pros**: High confidence in backend stability and correctness; catches bugs early.
    - **Cons**: Time-consuming, but essential for quality.

- **Step 6.2: Write Unit/Component Tests for Pinia Store and Frontend Components.**
    - **Task**: Create test files (e.g., `test/unit/stores/admin/users.spec.ts` for the Pinia store and `test/nuxt/components/admin/user-list.spec.ts` for components). These tests will verify state management, data fetching, UI rendering, and user interactions.
    - **Reasoning**: Ensures the frontend logic and UI behave as expected, providing a reliable user experience.
    - **Pros**: High confidence in frontend stability and user experience; prevents regressions.
    - **Cons**: Time-consuming, but crucial for a reliable UI.

---

**Critical Review and Reasoning for this Approach:**

- **Granularity of Steps**: Each step is intentionally small and focused, designed to be a single, atomic change suitable for a single Git commit. This approach significantly enhances manageability, makes code reviews easier, and simplifies debugging by isolating changes.
- **Logical Progression**: The plan follows a clear and logical order:
    1.  **Foundation (Database)**: Ensures the data model is correct before building on it.
    2.  **Backend First**: Develops the API endpoints that the frontend will consume, allowing for independent testing of business logic.
    3.  **Frontend Integration**: Builds the UI and connects it to the already functional backend.
    4.  **Refinements**: Adds advanced features like search, sort, and pagination once the core CRUD is stable.
    5.  **Cross-Cutting Concerns (Security & Logging)**: Integrates these critical aspects after the functional core is in place, ensuring they are applied comprehensively.
    6.  **Testing**: Verifies all components, both backend and frontend, ensuring quality and preventing regressions.
- **Pros of this Approach**:
    - **Reduced Risk**: Small, isolated changes minimize the impact of errors and make them easier to identify and fix.
    - **Improved Maintainability**: Clear separation of concerns and well-defined steps lead to a more organized and understandable codebase.
    - **Better Collaboration**: Multiple developers can work on different steps concurrently with minimal merge conflicts.
    - **Clear Progress Tracking**: Each step represents a tangible piece of work, making it easy to track development progress.
    - **Early Feedback**: Core functionalities are built and testable early in the process.
- **Cons of this Approach**:
    - **Initial Overhead**: Requires more upfront planning compared to a less structured approach.
    - **Perceived Slower Start**: The initial phases might feel slower due to the focus on foundational elements and small steps, but this pays off in reduced debugging time and higher quality later.

This implementation plan provides a robust, systematic, and professional roadmap for delivering the Admin User Management feature efficiently and with high quality.
