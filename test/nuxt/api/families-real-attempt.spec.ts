import { describe, expect, it, beforeAll } from "vitest";
import { setup, $fetch } from "@nuxt/test-utils/e2e";
import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { readBody, createError } from "h3";
import { setUserSession } from "#auth";
import { db } from "~~/server/db";
import {
    withTestTransaction,
    createTestUser,
    createTestFamily,
} from "#test/utils";
import { eq, and } from "drizzle-orm";
import { families, familyMembers, users } from "~~/server/db/schema";

describe.skip("Families API Endpoints (Real Server) - SKIPPED: E2E approach not compatible with transaction isolation", async () => {
    // Start a real Nuxt server for these tests
    await setup({ server: true, browser: false });

    // Register ONLY the test login endpoint to enable authentication in tests
    // All other endpoints will use real implementations
    beforeAll(() => {
        registerEndpoint("/api/test/login", {
            method: "POST",
            handler: async (event) => {
                const { userId } = await readBody(event);
                if (!userId) {
                    throw createError({
                        statusCode: 400,
                        statusMessage: "userId is required",
                    });
                }

                const user = await db.query.users.findFirst({
                    where: eq(users.id, userId),
                });

                if (!user) {
                    throw createError({
                        statusCode: 404,
                        statusMessage: "User not found",
                    });
                }

                const session = {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        display_name: user.display_name,
                    },
                };
                await setUserSession(event, session);

                return { message: `Session created for user ${userId}` };
            },
        });
    });

    describe("GET /api/families", () => {
        it("should return 401 for unauthenticated users", async () => {
            await withTestTransaction(async () => {
                // No authentication setup - test unauthenticated access
                await expect($fetch("/api/families")).rejects.toMatchObject({
                    statusCode: 401,
                });
            });
        });

        it("should return an array of families for an authenticated user", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create and authenticate a user
                const user = await createTestUser(tx, {
                    email: "test@example.com",
                    username: "testuser",
                });
                // Login using the mocked test endpoint
                await $fetch("/api/test/login", {
                    method: "POST",
                    body: { userId: user.id },
                });

                // 2. Setup: Create two families for the user
                const family1 = await createTestFamily(tx, user.id, {
                    name: "Family 1",
                });
                const family2 = await createTestFamily(tx, user.id, {
                    name: "Family 2",
                });

                // 3. Action: Fetch families
                const response = await $fetch("/api/families");

                // 4. Assertion: Verify API response
                expect(response).toBeDefined();
                expect(response.length).toBe(2);

                // Verify the families are in the response
                const familyIds = response.map((f) => f.id);
                expect(familyIds).toContain(family1.id);
                expect(familyIds).toContain(family2.id);
            });
        });
    });

    describe("POST /api/families", () => {
        const validFamilyData = { name: "My New Family" };

        it("should return 401 for unauthenticated users", async () => {
            await withTestTransaction(async () => {
                // No authentication setup - test unauthenticated access
                await expect(
                    $fetch("/api/families", {
                        method: "POST",
                        body: validFamilyData,
                    }),
                ).rejects.toMatchObject({ statusCode: 401 });
            });
        });

        it("should return 400 for invalid data (e.g., missing name)", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create and authenticate a user
                const user = await createTestUser(tx);
                await $fetch("/api/test/login", {
                    method: "POST",
                    body: { userId: user.id },
                });

                // 2. Action: Try to create a family with empty name
                await expect(
                    $fetch("/api/families", {
                        method: "POST",
                        body: { name: "" },
                    }),
                ).rejects.toMatchObject({ statusCode: 400 });
            });
        });

        it("should create a family and return it", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create and authenticate a user
                const user = await createTestUser(tx, {
                    email: "creator@example.com",
                    username: "creator",
                });
                await $fetch("/api/test/login", {
                    method: "POST",
                    body: { userId: user.id },
                });

                // 2. Action: Create a family via API
                const response = await $fetch("/api/families", {
                    method: "POST",
                    body: validFamilyData,
                });

                // 3. Assertion: Verify API response
                expect(response).toBeDefined();
                expect(response.name).toBe(validFamilyData.name);
                expect(response.id).toBeDefined();
                expect(response.creator_id).toBe(user.id);

                // 4. Assertion: Verify database state directly
                const createdFamily = await tx.query.families.findFirst({
                    where: eq(families.id, response.id),
                });
                expect(createdFamily).toBeDefined();
                expect(createdFamily?.name).toBe(validFamilyData.name);
                expect(createdFamily?.creator_id).toBe(user.id);

                // 5. Assertion: Verify family membership was created
                const membership = await tx.query.familyMembers.findFirst({
                    where: and(
                        eq(familyMembers.family_id, response.id),
                        eq(familyMembers.user_id, user.id),
                    ),
                });
                expect(membership).toBeDefined();
                expect(membership?.role).toBe("manager");
            });
        });
    });
});
