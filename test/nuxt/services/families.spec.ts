import { describe, expect, it } from "vitest";
import { withTestTransaction, createTestUser } from "#test/utils";
import { createFamily } from "#server/services/families";
import { eq } from "drizzle-orm";
import { families, familyMembers } from "~~/server/db/schema";

describe("Family Service", () => {
    describe("createFamily", () => {
        it("should create a family with the user as creator and manager", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create a test user
                const user = await createTestUser(tx);

                // 2. Action: Call service directly with test transaction
                const family = await createFamily(tx, user.id, {
                    name: "Test Family",
                });

                // 3. Assertions: Verify the result
                expect(family).toBeDefined();
                expect(family.name).toBe("Test Family");
                expect(family.creator_id).toBe(user.id);
                expect(family.id).toBeDefined();

                // 4. Verify database state directly
                const dbFamily = await tx.query.families.findFirst({
                    where: eq(families.id, family.id),
                });
                expect(dbFamily).toBeDefined();
                expect(dbFamily?.name).toBe("Test Family");
                expect(dbFamily?.creator_id).toBe(user.id);

                // 5. Verify family membership was created
                const membership = await tx.query.familyMembers.findFirst({
                    where: eq(familyMembers.family_id, family.id),
                });
                expect(membership).toBeDefined();
                expect(membership?.user_id).toBe(user.id);
                expect(membership?.role).toBe("manager");

                // Transaction will automatically roll back after this test
            });
        });

        it("should throw an error if family creation fails", async () => {
            await withTestTransaction(async (tx) => {
                // Test with invalid user ID (non-existent)
                await expect(
                    createFamily(tx, "non-existent-user-id", {
                        name: "Test Family",
                    }),
                ).rejects.toThrow();
            });
        });

        it("should create multiple families for the same user", async () => {
            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx);

                const family1 = await createFamily(tx, user.id, {
                    name: "Family 1",
                });
                const family2 = await createFamily(tx, user.id, {
                    name: "Family 2",
                });

                expect(family1.id).not.toBe(family2.id);
                expect(family1.name).toBe("Family 1");
                expect(family2.name).toBe("Family 2");
                expect(family1.creator_id).toBe(user.id);
                expect(family2.creator_id).toBe(user.id);
            });
        });
    });
});
