# 2025-10-07-FRONTEND_ADMIN_ROUTE_TESTING_GUIDE.md

## Implementation Guide: Testing Frontend Admin Routes Access Control

This guide provides a step-by-step process to implement integration tests for frontend routes starting with `/admin`, ensuring they are only accessible by authenticated and authorized admin users. We will use Vitest and `@nuxt/test-utils` with `mountSuspended` to simulate different user states and assert correct routing behavior.

### Prerequisites

- Node.js and pnpm installed.
- Familiarity with Vitest and Nuxt.js testing utilities.
- The `@nuxt/test-utils` package is installed in your project.
- A Nuxt route middleware (e.g., `app/middleware/admin.ts`) that handles authentication and authorization for admin routes.
- A composable or Pinia store (e.g., `useAuth` or `useUserSession`) that provides the current user's authentication status and roles.

### Recommended Approach: Integration Testing with `@nuxt/test-utils` and `mountSuspended`

This approach offers the best balance between realism, speed, and maintainability for testing frontend route access control. It allows us to test the middleware within the Nuxt routing context, ensuring that it's correctly applied and behaves as expected, while still providing enough control through mocking to cover various authentication and authorization scenarios efficiently.

### Step 1: Ensure Admin Route Middleware Exists and is Configured

(This step remains the same. Ensure you have a middleware similar to the example below.)

**Example `app/middleware/admin.ts`:**

```typescript
import {
    defineNuxtRouteMiddleware,
    navigateTo,
    useUserSession,
} from "#imports";

export default defineNuxtRouteMiddleware(async () => {
    const { loggedIn, user } = useUserSession();

    if (!loggedIn.value) {
        return navigateTo("/auth/login");
    }

    const isAdmin = user.value?.roles.some((role) => role.name === "admin");

    if (!isAdmin) {
        return navigateTo("/"); // Or a dedicated /forbidden page
    }
});
```

### Step 2: Create the Test File

(This step remains the same.)

Create a new test file for your admin middleware tests. A good location would be `test/nuxt/middleware/admin.spec.ts`.

### Step 3: Import Necessary Utilities and Mock `useAuth`

In your `admin.spec.ts` file, import the required functions from `vitest` and `@nuxt/test-utils/runtime`. Crucially, you'll need to mock your `useAuth` composable (or whatever handles user session and roles) to control the authentication and authorization state during tests.

```typescript
import { it, expect, describe, vi, beforeEach } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { definePageMeta } from "#imports";
import { navigateTo } from "#app"; // Import navigateTo from #app for mocking

// Mock the useAuth composable
const mockUseAuth = vi.hoisted(() => {
    return {
        useAuth: vi.fn(() => ({
            loggedIn: ref(false),
            isAdmin: ref(false),
            ensureSessionLoaded: vi.fn(() => Promise.resolve()),
        })),
    };
});

vi.mock("~/composables/useAuth", mockUseAuth);

// Mock navigateTo to prevent actual navigation during tests
vi.mock("#app", async (importOriginal) => {
    const actual = await importOriginal<typeof import("#app")>();
    return {
        ...actual,
        navigateTo: vi.fn((path: string) => path), // Return the path for assertion
    };
});

// Define a dummy admin page component for mounting
const AdminPage = defineComponent({
    setup() {
        definePageMeta({
            middleware: ["admin"],
        });
    },
    template: "<div>Admin Page Content</div>",
});
```

### Step 4: Implement Test Scenarios

Now, write your test cases within a `describe` block. You'll need to reset the mock state before each test to ensure isolation.

```typescript
describe("Admin Route Access Control", () => {
    let loggedInRef: Ref<boolean>;
    let isAdminRef: Ref<boolean>;
    let navigateToMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
        loggedInRef = ref(false);
        isAdminRef = ref(false);
        mockUseAuth.useAuth.mockReturnValue({
            loggedIn: loggedInRef,
            isAdmin: isAdminRef,
            ensureSessionLoaded: vi.fn(() => Promise.resolve()),
        });
        navigateToMock = navigateTo as ReturnType<typeof vi.fn>;
    });

    // --- Test Case 1: Unauthenticated User ---
    it("should redirect to /auth/login for unauthenticated users trying to access /admin", async () => {
        loggedInRef.value = false; // Simulate unauthenticated user

        await mountSuspended(AdminPage, { route: "/admin" });

        expect(navigateToMock).toHaveBeenCalledWith("/auth/login");
    });

    // --- Test Case 2: Authenticated Non-Admin User ---
    it("should redirect to /forbidden for authenticated non-admin users trying to access /admin", async () => {
        loggedInRef.value = true; // Simulate authenticated user
        isAdminRef.value = false; // Simulate non-admin user

        await mountSuspended(AdminPage, { route: "/admin" });

        expect(navigateToMock).toHaveBeenCalledWith("/forbidden");
    });

    // --- Test Case 3: Authenticated Admin User ---
    it("should allow access to /admin for authenticated admin users", async () => {
        loggedInRef.value = true; // Simulate authenticated user
        isAdminRef.value = true; // Simulate admin user

        const wrapper = await mountSuspended(AdminPage, { route: "/admin" });

        expect(navigateToMock).not.toHaveBeenCalled(); // No redirection should occur
        expect(wrapper.html()).toContain("Admin Page Content"); // Assert content is rendered
    });

    // --- Test Case 4: Specific Admin Sub-route (e.g., /admin/users) ---
    it("should redirect to /auth/login for unauthenticated users trying to access /admin/users", async () => {
        loggedInRef.value = false; // Simulate unauthenticated user

        await mountSuspended(AdminPage, { route: "/admin/users" });

        expect(navigateToMock).toHaveBeenCalledWith("/auth/login");
    });

    it("should redirect to /forbidden for authenticated non-admin users trying to access /admin/users", async () => {
        loggedInRef.value = true; // Simulate authenticated user
        isAdminRef.value = false; // Simulate non-admin user

        await mountSuspended(AdminPage, { route: "/admin/users" });

        expect(navigateToMock).toHaveBeenCalledWith("/forbidden");
    });

    it("should allow access to /admin/users for authenticated admin users", async () => {
        loggedInRef.value = true; // Simulate authenticated user
        isAdminRef.value = true; // Simulate admin user

        const wrapper = await mountSuspended(AdminPage, {
            route: "/admin/users",
        });

        expect(navigateToMock).not.toHaveBeenCalled();
        expect(wrapper.html()).toContain("Admin Page Content");
    });
});
```

### Step 5: Run the Tests

Execute your tests using the pnpm command for Nuxt tests:

```bash
pnpm run test:nuxt
```

This will run all tests in the `test/nuxt/` directory, including your new `admin.spec.ts` file.

By following these steps, you can effectively verify the access control for your frontend admin routes, ensuring that only authorized administrators can access them.
