# Authentication Refactoring Plan

This document outlines the plan to refactor the authentication system of the Klankern project.

## 1. Analysis of the Current System

The existing authentication is a custom-built solution using:

- **Frontend:** A Vue page (`pages/auth/login.vue`) and a `useAuth` composable.
- **Backend:** A custom API endpoint (`server/api/auth/login.post.ts`) for handling credentials and a middleware (`server/middleware/auth.ts`) for protecting routes.
- **Database:** A `sessions` table to store session tokens.

This is a common approach, but it requires manual implementation and maintenance for security features and session management.

## 2. Proposed Solution: `nuxt-security` + `nuxt-auth-utils`

This solution focuses on leveraging official and community-maintained Nuxt modules to handle security and authentication.

### Detailed Plan

1.  **Installation:**
    - Install the necessary modules:
        ```bash
        pnpm add nuxt-security nuxt-auth-utils
        ```

2.  **Environment Variables:**
    - Create a `.env` file in the project root.
    - Add a secure session password:
        ```
        NUXT_SESSION_PASSWORD=a-very-secure-password-with-at-least-32-characters
        ```

3.  **Configuration (`nuxt.config.ts`):**
    - Add the modules to the `modules` array:
        ```typescript
        export default defineNuxtConfig({
            modules: ["nuxt-security", "nuxt-auth-utils"],
        });
        ```
    - Configure `nuxt-security` for basic security headers. Most of the defaults are sensible, but we can customize them if needed.
    - Configure `nuxt-auth-utils` to define authentication providers. For now, we'll set up a "credentials" provider.

4.  **API Routes:**
    - `nuxt-auth-utils` will handle the creation of most of the necessary API endpoints automatically (e.g., for session management).
    - We will need to create an event handler for our credentials-based login. This will involve creating a file like `server/api/auth/credentials.post.ts` that will contain the logic for verifying the user's email and password.

5.  **Middleware:**
    - Remove the custom middleware `server/middleware/auth.ts`.
    - Protect pages by adding `definePageMeta({ middleware: 'auth' })` to the script section of the Vue components that require authentication. The `auth` middleware is provided by `nuxt-auth-utils`.

6.  **Frontend (`pages/auth/login.vue`):**
    - Update the login page to use the `useUserSession` composable from `nuxt-auth-utils`.
    - The `signIn` function from the composable will be used to authenticate the user.

7.  **Composables (`composables/useAuth.ts`):**
    - The `useAuth.ts` composable will be removed, as its functionality will be replaced by the composables provided by `nuxt-auth-utils`.

8.  **Database:**
    - The `sessions` table will no longer be needed. I will generate a database migration to remove this table.

### Pros

- **Robust Security:** `nuxt-security` provides a wide range of security features out of the box, following OWASP guidelines.
- **Simplified Code:** `nuxt-auth-utils` abstracts away much of the boilerplate code for authentication.
- **Official Support:** Being official Nuxt modules, they are well-integrated and maintained.
- **Extensible:** Easy to add more authentication providers (e.g., GitHub, Google) in the future.

### Cons

- **Learning Curve:** Requires understanding the configuration and APIs of the two new modules.
- **Less Control:** The abstraction might make it harder to debug or implement very custom authentication flows.
