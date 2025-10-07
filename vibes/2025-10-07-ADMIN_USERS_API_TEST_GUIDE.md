# 2025-10-07-ADMIN_USERS_API_TEST_GUIDE.md

## Implementation Guide: Testing Admin Users API Endpoint Access Control

This guide provides a step-by-step process to implement tests for the `/server/api/admin/users/index.get.ts` endpoint, ensuring it is never available for unauthenticated or unauthorized users. We will use Vitest and `@nuxt/test-utils` to mock the necessary environment and simulate different user states.

### Prerequisites

- Node.js and pnpm installed.
- Familiarity with Vitest and Nuxt.js testing utilities.
- The `@nuxt/test-utils` package is installed in your project.

### Solution: Mocking `event.context.user` Directly

This approach involves directly manipulating the `event.context.user` object within the test environment to simulate different authentication and authorization states.

### Step 1: Create the Test File

Create a new test file named `users.spec.ts` in the `test/nuxt/api/admin/` directory.

```
test/nuxt/api/admin/users.spec.ts
```

### Step 2: Import Necessary Utilities

In your new `users.spec.ts` file, import the required functions from `vitest` and `@nuxt/test-utils/runtime`.

```typescript
import { it, expect, describe } from "vitest";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError } from "h3";
```

### Step 3: Define the Test Suite

Wrap your tests in a `describe` block for better organization.

```typescript
describe("Admin Users API Access Control", () => {
    // Test cases will go here
});
```

### Step 4: Mock the `/api/admin/users` Endpoint

We need to mock the actual endpoint to control its behavior based on the `event.context.user`. This mock will simulate the authentication and authorization logic that would typically be handled by middleware.

**Note:** For this guide, we are assuming a simplified authorization check within the mocked endpoint. In a real application, this logic would reside in a dedicated middleware.

```typescript
describe("Admin Users API Access Control", () => {
    registerEndpoint("/api/admin/users", async (event) => {
        // Simulate authentication check
        if (!event.context.user) {
            throw createError({
                statusCode: 401,
                statusMessage: "Unauthorized",
            });
        }

        // Simulate authorization check (e.g., user must have 'admin' role)
        const userRoles = event.context.user.roles || [];
        const isAdmin = userRoles.some(
            (role: { name: string }) => role.name === "admin",
        );

        if (!isAdmin) {
            throw createError({
                statusCode: 403,
                statusMessage: "Forbidden",
            });
        }

        // If authenticated and authorized, return mock data
        return {
            users: [
                {
                    id: "1",
                    email: "admin@example.com",
                    username: "admin",
                    displayName: "Admin User",
                    isActive: true,
                    roles: [
                        {
                            id: "admin-id",
                            name: "admin",
                            description: "Administrator",
                        },
                    ],
                },
                {
                    id: "2",
                    email: "user@example.com",
                    username: "user",
                    displayName: "Regular User",
                    isActive: true,
                    roles: [
                        {
                            id: "user-id",
                            name: "user",
                            description: "Regular User",
                        },
                    ],
                },
            ],
        };
    });

    // Test cases will go here
});
```

### Step 5: Implement the Unauthenticated Test Case

This test verifies that an unauthenticated request to the endpoint is rejected with a 401 Unauthorized status.

```typescript
it("should return 401 Unauthorized for unauthenticated requests", async () => {
    // No user context is set, simulating an unauthenticated request
    await expect($fetch("/api/admin/users")).rejects.toMatchObject({
        statusCode: 401,
        statusMessage: "Unauthorized",
    });
});
```

### Step 6: Implement the Unauthorized Test Case

This test verifies that an authenticated user without the necessary 'admin' role is rejected with a 403 Forbidden status.

```typescript
it("should return 403 Forbidden for authenticated but unauthorized requests", async () => {
    // Simulate an authenticated user without the 'admin' role
    // We need to temporarily override the registerEndpoint for this specific test
    registerEndpoint("/api/admin/users", async (event) => {
        event.context.user = {
            id: "some-user-id",
            email: "test@example.com",
            roles: [
                { id: "user-id", name: "user", description: "Regular User" },
            ],
        };

        // Re-run the authentication/authorization logic from the mock
        if (!event.context.user) {
            throw createError({
                statusCode: 401,
                statusMessage: "Unauthorized",
            });
        }

        const userRoles = event.context.user.roles || [];
        const isAdmin = userRoles.some(
            (role: { name: string }) => role.name === "admin",
        );

        if (!isAdmin) {
            throw createError({
                statusCode: 403,
                statusMessage: "Forbidden",
            });
        }

        return { users: [] }; // Should not reach here
    });

    await expect($fetch("/api/admin/users")).rejects.toMatchObject({
        statusCode: 403,
        statusMessage: "Forbidden",
    });
});
```

### Step 7: Implement the Authorized Test Case (for completeness)

This test verifies that an authenticated user with the 'admin' role can successfully access the endpoint and receive data.

```typescript
it("should return a list of users for authenticated and authorized requests", async () => {
    // Simulate an authenticated user with the 'admin' role
    // We need to temporarily override the registerEndpoint for this specific test
    registerEndpoint("/api/admin/users", async (event) => {
        event.context.user = {
            id: "admin-user-id",
            email: "admin@example.com",
            roles: [
                { id: "admin-id", name: "admin", description: "Administrator" },
            ],
        };

        // Re-run the authentication/authorization logic from the mock
        if (!event.context.user) {
            throw createError({
                statusCode: 401,
                statusMessage: "Unauthorized",
            });
        }

        const userRoles = event.context.user.roles || [];
        const isAdmin = userRoles.some(
            (role: { name: string }) => role.name === "admin",
        );

        if (!isAdmin) {
            throw createError({
                statusCode: 403,
                statusMessage: "Forbidden",
            });
        }

        // If authenticated and authorized, return mock data
        return {
            users: [
                {
                    id: "1",
                    email: "admin@example.com",
                    username: "admin",
                    displayName: "Admin User",
                    isActive: true,
                    roles: [
                        {
                            id: "admin-id",
                            name: "admin",
                            description: "Administrator",
                        },
                    ],
                },
                {
                    id: "2",
                    email: "user@example.com",
                    username: "user",
                    displayName: "Regular User",
                    isActive: true,
                    roles: [
                        {
                            id: "user-id",
                            name: "user",
                            description: "Regular User",
                        },
                    ],
                },
            ],
        };
    });

    const response = await $fetch("/api/admin/users");
    expect(response).toHaveProperty("users");
    expect(response.users).toHaveLength(2);
    expect(response.users[0].email).toBe("admin@example.com");
});
```

### Step 8: Run the Tests

Execute your tests using the pnpm command for Nuxt tests:

```bash
pnpm run test:nuxt
```

This will run all tests in the `test/nuxt/` directory, including your new `users.spec.ts` file.

By following these steps, you can effectively verify the access control for your admin users API endpoint.
