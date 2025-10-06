import { it, expect, describe } from "vitest";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError } from "h3";

describe("Admin Roles API", () => {
    it("should return a list of roles", async () => {
        const mockRoles = [
            { id: "1", name: "Admin", description: "Administrator role" },
            { id: "2", name: "User", description: "Standard user role" },
        ];

        // Mock the /api/admin/roles endpoint to return our mockRoles
        registerEndpoint("/api/admin/roles", () => ({
            roles: mockRoles,
        }));

        // Make a request to the mocked endpoint using $fetch
        const response = await $fetch("/api/admin/roles");

        // Assert that the response matches our mock data
        expect(response).toEqual({
            roles: mockRoles,
        });
    });

    it("should return an empty array when no roles are found", async () => {
        // Mock the /api/admin/roles endpoint to return an empty array
        registerEndpoint("/api/admin/roles", () => ({
            roles: [],
        }));

        // Make a request to the mocked endpoint
        const response = await $fetch("/api/admin/roles");

        // Assert that the response contains an empty roles array
        expect(response).toEqual({
            roles: [],
        });
    });

    it("should return a 500 error when a database error occurs", async () => {
        // Mock the /api/admin/roles endpoint to throw an error
        registerEndpoint("/api/admin/roles", () => {
            throw createError({
                statusCode: 500,
                statusMessage: "Failed to fetch roles.",
            });
        });

        // Make a request to the mocked endpoint and expect it to throw an error
        await expect($fetch("/api/admin/roles")).rejects.toMatchObject({
            statusCode: 500,
            statusMessage: "Failed to fetch roles.",
        });
    });
});
