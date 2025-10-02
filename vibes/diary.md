### 2025-10-02

**User Management Module Refinements**

- **Backend API Updates:**
    - Refactored user fetching logic in `server/api/admin/users/index.get.ts` to use explicit SQL joins instead of Drizzle ORM's nested `with` clauses, resolving a SQL syntax error for many-to-many relationships.
    - Fixed password comparison logic in `server/api/auth/credentials.post.ts` by correctly referencing `user.password` instead of `user.passwordHash`.
    - Added Zod validation for `userId` parameters in `server/api/admin/users/[id].delete.ts`, `server/api/admin/users/[id].get.ts`, `server/api/admin/users/[id].put.ts`, `server/api/admin/users/[id]/reset-password.post.ts`, and `server/api/admin/users/[id]/status.put.ts` for improved robustness.

- **Shared Types and Zod Schemas:**
    - Created `shared/types/user.ts` and moved `newUserSchema`, `updateUserSchema`, `passwordResetSchema`, `roleSchema`, `userResponseSchema`, and `statusUpdateSchema` to this file to enable type sharing between frontend and backend.

- **Frontend Updates:**
    - Updated frontend user roles display in `app/pages/admin/users/index.vue` to correctly match the new API response structure (`user.roles` instead of `user.userRoles`).
    - Updated Pinia store (`app/stores/admin/users.ts`) and Vue components (`app/pages/admin/users/create.vue`, `app/pages/admin/users/[id].vue`, `app/components/admin/user-form.vue`) to utilize the new shared Zod-inferred types.

- **Import Optimization:**
    - Optimized import statements across all modified files to leverage Nuxt 4's auto-import feature for types from `~/shared/types`.
    - Ensured `import { z } from "zod";` is explicitly present in server-side files where `zod` is directly used, as `zod` is not auto-imported by Nuxt 4.
