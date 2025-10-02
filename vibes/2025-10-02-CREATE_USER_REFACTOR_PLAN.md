# Create User Refactor Plan

This document outlines the plan to refactor the "create user" functionality, as approved on 2025-10-02.

## Recommended Refactor (Solution B)

This is a thorough approach that refactors the code to align with Nuxt 4 best practices and the project's established guidelines.

### Backend (`server/api/admin/users.post.ts`)

- **Input Validation:** Use **Zod** to validate the incoming request body against the `UserCreation` type from `shared/types/user.ts`. This ensures data integrity and provides clear error messages.
- **Logging:** Integrate the **Winston logger** for structured, server-side logging, as specified in the project guidelines.
- **Error Handling:** Improve error handling to return specific and appropriate HTTP status codes.

### Frontend

- **Separation of Concerns:** Refactor the frontend components to follow the "smart" container and "dumb" presentational component pattern.
    - **`app/pages/admin/users/create.vue` (The "Smart" Page):** This page will be responsible for managing the form's state, handling the submission, calling the `createUser` function from the `useAdmin` composable, and managing the UI state (e.g., loading indicators, error messages) and navigation.
    - **`app/components/admin/form-user-create.vue` (The "Dumb" Component):** This component will be simplified to only handle the presentation of the form. It will receive data via props and emit an event with the form data when submitted. It will have no knowledge of API calls or application state.
- **Composable (`app/composables/useAdmin.ts`):** The `createUser` function will be streamlined to focus solely on making the API request and returning the result, without managing component-level state.

### Benefits

- **Robust and Maintainable:** The code will be easier to understand, test, and maintain.
- **Follows Best Practices:** Aligns with both Nuxt 4 conventions and the project's specific guidelines.
- **Scalable:** This architecture is much easier to build upon for future features.
