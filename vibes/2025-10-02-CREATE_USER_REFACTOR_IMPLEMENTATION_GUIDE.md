## Create User: Refactoring Implementation Guide

This guide details the process for refactoring the "create user" functionality based on the approved plan.

---

### **Part 1: Backend Refactoring**

Our goal here is to make the API endpoint more robust, secure, and aligned with the project's standards.

#### **Step 1: Install Zod**

- **Goal:** Add Zod to the project for data validation.
- **Implementation:** I'll run the following command to add Zod as a dependency:
  I will run `pnpm add zod`. This will add Zod to the project's dependencies.
- **Critical Reasoning:** Using a validation library like Zod is crucial for security and data integrity. It prevents invalid or malicious data from reaching our database and provides a single source of truth for our data shapes.

#### **Step 2: Define the Validation Schema**

- **Goal:** Create a Zod schema that defines the shape of the data for creating a new user.
- **Implementation:** I will create a new file at `server/db/schemas/user.ts` to house our user-related Zod schemas. This keeps our validation logic organized and reusable.

    ```typescript
    // server/db/schemas/user.ts
    import { z } from "zod";

    export const userCreationSchema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email address"),
        password: z
            .string()
            .min(8, "Password must be at least 8 characters long"),
        roleId: z.string().uuid("Invalid role ID"),
    });
    ```

- **Critical Reasoning:** Centralizing schemas makes them easier to manage and import wherever validation is needed. It also ensures consistency between what the frontend sends and what the backend expects.
- **Clarification Needed:**
    - **Password Complexity:** The current schema only checks for a minimum length. Do you require more complex password rules (e.g., uppercase letters, numbers, special characters)?

#### **Step 3: Refactor the API Endpoint**

- **Goal:** Update the `users.post.ts` endpoint to use our new Zod schema for validation and to integrate the project's logger.
- **Implementation:** I will modify `server/api/admin/users.post.ts` as follows:

    ```typescript
    // server/api/admin/users.post.ts
    import { db } from "#/server/db";
    import { users } from "#/server/db/schema";
    import { userCreationSchema } from "#/server/db/schemas/user";
    import { logger } from "#/server/utils/logger";

    export default defineEventHandler(async (event) => {
        try {
            const body = await readValidatedBody(
                event,
                userCreationSchema.parse,
            );

            const hashedPassword = await hashPassword(body.password);

            const newUser = await db
                .insert(users)
                .values({
                    name: body.name,
                    email: body.email,
                    password: hashedPassword,
                    roleId: body.roleId,
                })
                .returning();

            logger.info(`User created: ${newUser[0].email}`);
            return newUser[0];
        } catch (error: any) {
            logger.error("Error creating user:", error);

            if (error.code === "23505") {
                // Unique constraint violation for email
                throw createError({
                    statusCode: 409,
                    statusMessage: "A user with this email already exists.",
                });
            }

            throw createError({
                statusCode: 500,
                statusMessage: "An unexpected error occurred.",
            });
        }
    });
    ```

- **Critical Reasoning:** Using `readValidatedBody` from Nuxt's server engine (Nitro) is the most efficient way to handle validation. It automatically throws a 400 Bad Request error with a descriptive message if the validation fails, which saves us from writing boilerplate error-handling code. Integrating the logger provides better visibility into the application's behavior.

---

### **Part 2: Frontend Refactoring**

Here, we'll restructure the frontend to follow the "smart container, dumb component" pattern. This improves reusability, testability, and separation of concerns.

#### **Step 4: Refactor the `useAdmin` Composable**

- **Goal:** Simplify the `createUser` function to only be responsible for the API call.
- **Implementation:** I will update the `createUser` function in `app/composables/useAdmin.ts`:

    ```typescript
    // app/composables/useAdmin.ts
    // ... (other functions in the composable)

    export const useAdmin = () => {
        // ...

        const createUser = async (userData: UserCreation) => {
            return useFetch("/api/admin/users", {
                method: "POST",
                body: userData,
            });
        };

        // ...
        return {
            // ...
            createUser,
            // ...
        };
    };
    ```

- **Critical Reasoning:** Composables for API calls should be lean. Their job is to interact with the network and return the result. They shouldn't be concerned with component state or what happens after the request completes.

#### **Step 5: Refactor `form-user-create.vue` (Dumb Component)**

- **Goal:** Turn this into a purely presentational component.
- **Implementation:** I will refactor `app/components/admin/form-user-create.vue` to remove all logic. It will now emit a `submit` event with the form data.

    ```vue
    <!-- app/components/admin/form-user-create.vue -->
    <template>
        <form @submit.prevent="handleSubmit">
            <form-user-base v-model:user="user" />
            <button-base type="submit">Create User</button-base>
        </form>
    </template>

    <script setup lang="ts">
    import { ref } from "vue";
    import type { UserCreation } from "#/shared/types/user";

    const emit = defineEmits(["submit"]);

    const user = ref<UserCreation>({
        name: "",
        email: "",
        password: "",
        roleId: "",
    });

    const handleSubmit = () => {
        emit("submit", user.value);
    };
    </script>
    ```

- **Critical Reasoning:** "Dumb" components are highly reusable and easy to test because they are completely decoupled from the application's business logic. They simply render UI based on props and emit events.

#### **Step 6: Refactor `create.vue` Page (Smart Container)**

- **Goal:** Make this page the "smart" container that manages state and handles the logic for creating a user.
- **Implementation:** I will update `app/pages/admin/users/create.vue` to handle the form submission, API call, and user feedback.

    ```vue
    <!-- app/pages/admin/users/create.vue -->
    <template>
        <div>
            <h1>Create User</h1>
            <form-user-create @submit="handleCreateUser" />
            <p v-if="pending">Creating user...</p>
            <p v-if="error">
                {{ error.data?.message || "An error occurred." }}
            </p>
        </div>
    </template>

    <script setup lang="ts">
    import { ref } from "vue";
    import { useRouter } from "vue-router";
    import { useAdmin } from "#/app/composables/useAdmin";
    import type { UserCreation } from "#/shared/types/user";

    const { createUser } = useAdmin();
    const router = useRouter();

    const pending = ref(false);
    const error = ref<any>(null);

    const handleCreateUser = async (userData: UserCreation) => {
        pending.value = true;
        error.value = null;
        const { error: fetchError } = await createUser(userData);

        pending.value = false;

        if (fetchError.value) {
            error.value = fetchError.value;
        } else {
            // Navigate to the user list or the new user's page on success
            router.push("/admin/users");
        }
    };
    </script>
    ```

- **Critical Reasoning:** The page is the natural place to orchestrate these actions. It owns the "flow" of creating a user: displaying the form, handling the submission, showing feedback, and navigating away. This makes the logic easy to follow.
- **Clarification Needed:**
    - **User Experience:** How would you like to display loading and error states? The example uses simple `<p>` tags, but we could implement more sophisticated UI like toast notifications or inline field errors.
