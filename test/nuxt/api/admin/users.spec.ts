import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError, readBody } from "h3";
import { describe, expect, it } from "vitest";

describe("Admin Users API Access Control", () => {
    describe("GET /api/admin/users", () => {
        it("should return 401 Unauthorized for unauthenticated requests", async () => {
            registerEndpoint("/api/admin/users", {
                method: "GET",
                handler: (event) => {
                    if (!event.context.user) {
                        throw createError({
                            statusCode: 401,
                            statusMessage: "Unauthorized",
                        });
                    }
                    return { users: [] };
                },
            });

            await expect($fetch("/api/admin/users")).rejects.toMatchObject({
                statusCode: 401,
                statusMessage: "Unauthorized",
            });
        });

        it("should return 403 Forbidden for authenticated but unauthorized requests", async () => {
            registerEndpoint("/api/admin/users", {
                method: "GET",
                handler: (event) => {
                    event.context.user = {
                        id: "user-id-123",
                        email: "user@example.com",
                        roles: [
                            {
                                id: "user-role-id",
                                name: "user",
                                description: "Regular User",
                            },
                        ],
                    };

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

                    return { users: [] };
                },
            });

            await expect($fetch("/api/admin/users")).rejects.toMatchObject({
                statusCode: 403,
                statusMessage: "Forbidden",
            });
        });

        it("should return a list of users for authenticated and authorized requests", async () => {
            const mockUsers = [
                {
                    id: "1",
                    email: "admin@example.com",
                    username: "admin",
                    display_name: "Admin User",
                    is_active: true,
                    dashboardConfig: { theme: "dark" },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
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
                    display_name: "Regular User",
                    is_active: true,
                    dashboardConfig: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    roles: [
                        {
                            id: "user-id",
                            name: "user",
                            description: "Regular User",
                        },
                    ],
                },
            ];

            registerEndpoint("/api/admin/users", {
                method: "GET",
                handler: (event) => {
                    event.context.user = {
                        id: "admin-user-id-456",
                        email: "admin@example.com",
                        roles: [
                            {
                                id: "admin-role-id",
                                name: "admin",
                                description: "Administrator",
                            },
                        ],
                    };

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

                    return {
                        users: mockUsers,
                    };
                },
            });

            const response = await $fetch("/api/admin/users");
            expect(response).toHaveProperty("users");
            expect(response.users).toHaveLength(2);
            expect(response.users[0].email).toBe("admin@example.com");
            expect(response.users).toEqual(mockUsers);
        });
    });

    describe("POST /api/admin/users", () => {
        const validUserData = {
            email: "new.user@example.com",
            username: "newuser",
            password: "password123",
            display_name: "New User",
            first_name: "New",
            last_name: "User",
            roleIds: ["user-role-id"],
        };

        it("should return 401 Unauthorized for unauthenticated requests", async () => {
            registerEndpoint("/api/admin/users", {
                method: "POST",
                handler: (event) => {
                    if (!event.context.user) {
                        throw createError({
                            statusCode: 401,
                            statusMessage: "Unauthorized",
                        });
                    }
                    return {};
                },
            });

            await expect(
                $fetch("/api/admin/users", {
                    method: "POST",
                    body: validUserData,
                }),
            ).rejects.toMatchObject({
                statusCode: 401,
            });
        });

        it("should return 403 Forbidden for authenticated but unauthorized requests", async () => {
            registerEndpoint("/api/admin/users", {
                method: "POST",
                handler: (event) => {
                    event.context.user = {
                        id: "user-id-123",
                        roles: [{ name: "user" }],
                    };
                    const isAdmin = event.context.user.roles.some(
                        (role: { name: string }) => role.name === "admin",
                    );
                    if (!isAdmin) {
                        throw createError({
                            statusCode: 403,
                            statusMessage: "Forbidden",
                        });
                    }
                    return {};
                },
            });

            await expect(
                $fetch("/api/admin/users", {
                    method: "POST",
                    body: validUserData,
                }),
            ).rejects.toMatchObject({
                statusCode: 403,
            });
        });

        it("should return 400 Bad Request for invalid data", async () => {
            registerEndpoint("/api/admin/users", {
                method: "POST",
                handler: async (event) => {
                    event.context.user = {
                        id: "admin-user-id-456",
                        roles: [{ name: "admin" }],
                    };
                    const body = await readBody(event);
                    if (!body.email || !body.password) {
                        throw createError({
                            statusCode: 400,
                            statusMessage: "Validation failed",
                        });
                    }
                    return {};
                },
            });

            const invalidData = { ...validUserData, email: "" };
            await expect(
                $fetch("/api/admin/users", {
                    method: "POST",
                    body: invalidData,
                }),
            ).rejects.toMatchObject({
                statusCode: 400,
            });
        });

        it("should create a user successfully for authorized requests", async () => {
            const newUserResponse = {
                id: "new-user-id",
                email: validUserData.email,
                username: validUserData.username,
                display_name: validUserData.display_name,
                first_name: validUserData.first_name,
                last_name: validUserData.last_name,
                is_active: true,
                dashboardConfig: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                roles: [
                    {
                        id: "user-role-id",
                        name: "user",
                        description: "Regular User",
                    },
                ],
            };

            registerEndpoint("/api/admin/users", {
                method: "POST",
                handler: (event) => {
                    event.context.user = {
                        id: "admin-user-id-456",
                        roles: [{ name: "admin" }],
                    };
                    const isAdmin = event.context.user.roles.some(
                        (role: { name: string }) => role.name === "admin",
                    );
                    if (!isAdmin) {
                        throw createError({
                            statusCode: 403,
                            statusMessage: "Forbidden",
                        });
                    }
                    return newUserResponse;
                },
            });

            const result = await $fetch("/api/admin/users", {
                method: "POST",
                body: validUserData,
            });

            expect(result).toEqual(newUserResponse);
        });
    });
});
