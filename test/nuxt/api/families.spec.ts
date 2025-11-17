import { describe, expect, it } from "vitest";
import {
    withTestTransaction,
    createTestUser,
    createTestFamily,
} from "#test/utils";
import { eq, and } from "drizzle-orm";
import { families, familyMembers } from "~~/server/db/schema";
import { createFamily } from "#server/services/families";

describe("Family Service Tests", () => {
    describe("createFamily", () => {
        const validFamilyData = { name: "My New Family" };

        it("should create a family and add creator as manager", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create a user
                const user = await createTestUser(tx, {
                    email: "creator@example.com",
                    username: "creator",
                });

                // 2. Action: Create a family via service
                const family = await createFamily(tx, user.id, validFamilyData);

                // 3. Assertion: Verify family was created
                expect(family).toBeDefined();
                expect(family.name).toBe(validFamilyData.name);
                expect(family.id).toBeDefined();
                expect(family.creator_id).toBe(user.id);

                // 4. Assertion: Verify database state directly
                const createdFamily = await tx.query.families.findFirst({
                    where: eq(families.id, family.id),
                });
                expect(createdFamily).toBeDefined();
                expect(createdFamily?.name).toBe(validFamilyData.name);
                expect(createdFamily?.creator_id).toBe(user.id);

                // 5. Assertion: Verify family membership was created
                const membership = await tx.query.familyMembers.findFirst({
                    where: and(
                        eq(familyMembers.family_id, family.id),
                        eq(familyMembers.user_id, user.id),
                    ),
                });
                expect(membership).toBeDefined();
                expect(membership?.role).toBe("manager");
            });
        });

        it("should throw UnauthorizedError when userId is not provided", async () => {
            await withTestTransaction(async (tx) => {
                // Action & Assertion: Try to create family without user ID
                await expect(
                    createFamily(tx, "", validFamilyData),
                ).rejects.toThrow("User ID is required to create a family");
            });
        });

        it("should create multiple families for different users", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create two users
                const user1 = await createTestUser(tx, {
                    email: "user1@example.com",
                    username: "user1",
                });
                const user2 = await createTestUser(tx, {
                    email: "user2@example.com",
                    username: "user2",
                });

                // 2. Action: Create families for both users
                const family1 = await createFamily(tx, user1.id, {
                    name: "Family 1",
                });
                const family2 = await createFamily(tx, user2.id, {
                    name: "Family 2",
                });

                // 3. Assertion: Verify both families exist
                expect(family1.creator_id).toBe(user1.id);
                expect(family2.creator_id).toBe(user2.id);

                // 4. Verify database state
                const allFamilies = await tx.query.families.findMany();
                const familyIds = allFamilies.map((f) => f.id);
                expect(familyIds).toContain(family1.id);
                expect(familyIds).toContain(family2.id);
            });
        });
    });

    describe("Family and Membership Integration", () => {
        it("should verify family creator is manager", async () => {
            await withTestTransaction(async (tx) => {
                // Setup and create family
                const user = await createTestUser(tx);
                const family = await createTestFamily(tx, user.id, {
                    name: "Test Family",
                });

                // Verify membership role
                const membership = await tx.query.familyMembers.findFirst({
                    where: and(
                        eq(familyMembers.family_id, family.id),
                        eq(familyMembers.user_id, user.id),
                    ),
                });

                expect(membership?.role).toBe("manager");
            });
        });

        it("should handle family name with special characters", async () => {
            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx);
                const specialName = 'Family\'s "Test" & More!';

                const family = await createFamily(tx, user.id, {
                    name: specialName,
                });

                expect(family.name).toBe(specialName);
                const dbFamily = await tx.query.families.findFirst({
                    where: eq(families.id, family.id),
                });
                expect(dbFamily?.name).toBe(specialName);
            });
        });
    });
});
