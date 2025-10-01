### Finalized Architecture Plan: Admin User Management

**1. Deconstructed User Story & Key Requirements:**

The user story: "As a logged-in admin user, I want to be able to comprehensively manage all application users, including viewing a list of users, searching and filtering them, creating new user accounts, modifying existing user details (such as roles and contact information), resetting passwords, and deactivating or deleting accounts, all from a dedicated user management page within the `/admin` section of the frontend, so that I can efficiently maintain user data, control access, and provide support."

Key Requirements:

- **Authentication & Authorization**: Access restricted to logged-in admin users. For MVP, only 'admin' and 'user' roles exist, with 'admin' having access.
- **Frontend UI**: Dedicated page at `/admin/users` with:
    - User listing (with search/filter). Default sorting by `id`, but changeable by admin. Default pagination 50 items per page.
    - Forms for user creation.
    - Forms for user modification (roles, contact info).
    - Actions for password reset (admin manually sets password for MVP).
    - Actions for account deactivation/deletion (deletion is permanent for MVP).
- **Backend API**: Endpoints for all CRUD and specific management actions.
- **Database Interaction**: CRUD operations on user data, including roles.
- **Security**: Robust handling of passwords, input validation, and authorization.
- **Logging**: Server-side actions logged using Winston.

**2. High-Level Architecture Overview:**

This feature will integrate seamlessly into the existing Nuxt.js project structure, leveraging its full-stack capabilities (frontend and Nitro backend), PostgreSQL database, Drizzle ORM, Zod for validation, and Winston for logging.

- **Frontend**: Nuxt.js pages and components within `app/pages/admin/users/` and `app/components/admin/`. Pinia store for centralized state management.
- **Backend**: Nitro API routes under `server/api/admin/users/`. Drizzle ORM for database interactions, Zod for request validation, and Winston for server-side logging.
- **Database**: PostgreSQL, with a `users` table and a flexible `roles` and `user_roles` schema.

**3. Frontend Solutions (UI/State Management):**

- **Decision**: Centralized Pinia Store for User Management.
- **Reasoning**: Given the "comprehensive management" requirement, a dedicated Pinia store (`app/stores/admin/users.ts`) is the most appropriate solution. It centralizes user data, search/filter parameters, loading states, and API interactions. This approach promotes a clear separation of concerns, making the UI components purely presentational and the business logic encapsulated within the store. This leads to a more maintainable, scalable, and testable codebase compared to direct API calls from components or localized component state.
- **UI Elements**:
    - `app/pages/admin/users/index.vue`: Displays the list of users, search/filter controls, and actions (create, edit, delete, deactivate, reset password).
    - `app/pages/admin/users/create.vue`: Form for creating a new user.
    - `app/pages/admin/users/[id].vue`: Form for editing an existing user's details.
    - `app/components/admin/user-list.vue`: Table/list to display users with sortable column headers.
    - `app/components/admin/user-filter.vue`: Single search input field for comprehensive search across all data points.
    - `app/components/admin/user-form.vue`: Reusable form for creating/editing user details.
    - `app/components/admin/user-actions.vue`: Buttons/menus for user-specific actions (reset password, deactivate, delete).
    - Pagination controls with a default of 50 items per page.

**4. Backend Solutions (API Design & Logic):**

- **API Endpoints (`server/api/admin/users/`)**:
    - `index.get.ts`: Fetches a list of users. Accepts query parameters for search (`_q`), filter (e.g., `is_active`), pagination (`_page`, `_limit`), and sorting (`_sort`, `_order`). Default sorting by `id` ascending, default limit 50.
    - `index.post.ts`: Creates a new user.
    - `[id].get.ts`: Retrieves details for a specific user.
    - `[id].put.ts`: Updates an existing user's details.
    - `[id].delete.ts`: Deletes a user permanently (hard delete for MVP).
    - `[id]/reset-password.post.ts`: Resets a user's password (admin manually sets password for MVP).
    - `[id]/status.put.ts`: Updates a user's active status (deactivate/activate).
- **Validation**: Zod will be used extensively for input validation on all `POST` and `PUT` requests to ensure data integrity and security.
- **Authorization**: Server middleware or route-specific checks will be implemented using `nuxt-security` and `nuxt-auth-utils` to ensure only authenticated 'admin' users can access any endpoint under `/api/admin/*`.
- **Database Interaction**: Drizzle ORM will be used for all database operations. Queries for `index.get.ts` will dynamically apply search, filter, sort, and pagination parameters.
- **Password Handling**: `bcryptjs` will be used for hashing new passwords before storage and for secure comparison during password resets. Plaintext passwords will never be stored or transmitted.
- **Logging**: Winston will log all significant server-side actions (user creation, modification, deletion, password resets, authorization failures) for auditing and debugging purposes.

**5. Database Schema Considerations (PostgreSQL with Drizzle ORM):**

- **`users` table**:
    - `id` (UUID, Primary Key)
    - `email` (String, Unique)
    - `username` (String, Unique) - private user name.
    - `display_name` (String, Nullable) - visible to other users.
    - `password` (String, Hashed)
    - `first_name` (String, Nullable)
    - `last_name` (String, Nullable)
    - `is_active` (Boolean, Default: `true`) - for deactivation.
    - `created_at` (Timestamp)
    - `updated_at` (Timestamp)
- **Roles Schema**:
    - **Decision**: Separate `roles` table and `user_roles` join table (Many-to-Many relationship).
    - **Reasoning**: This approach provides maximum flexibility and scalability. It allows users to have multiple roles and simplifies the addition of new roles in the future.
        - `roles` table: `id` (Primary Key), `name` (String, Unique, e.g., 'admin', 'user'). Initially populated with 'admin' and 'user'.
        - `user_roles` table: `user_id` (Foreign Key to `users.id`), `role_id` (Foreign Key to `roles.id`), Composite Primary Key (`user_id`, `role_id`).
- **Migrations**: Drizzle migrations will be generated and applied for all schema changes.

**6. Security Considerations:**

- **Authentication**: Ensure admin user is properly authenticated via `nuxt-auth-utils`.
- **Authorization**: Strict role-based access control on all admin API endpoints, specifically checking for the 'admin' role.
- **Input Validation**: Comprehensive Zod validation on all incoming API data.
- **Password Security**: `bcryptjs` for hashing; never expose plaintext passwords.
- **Rate Limiting**: Consider implementing rate limiting on sensitive endpoints (e.g., password reset) to mitigate brute-force attacks.
- **Sensitive Data Exposure**: Carefully control which user data is exposed to the frontend, especially for non-admin contexts.

**7. Project To-Do:**

- Implement a proper password reset flow (e.g., user-initiated, email-based) for non-admin users in a later stage.
