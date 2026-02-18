import { describe, expect, it } from "vitest";
import {
    withTestTransaction,
    createTestUser,
    createTestFamily,
    type TestTransaction,
} from "#test/utils";
import { createFamily, transferOwnership } from "#server/services/families";
import { and, eq } from "drizzle-orm";
import { families, familyMembers } from "~~/server/db/schema";
import {
    UnauthorizedError,
    ForbiddenError,
    ValidationError,
    NotFoundError,
} from "#server/lib/errors";

describe("Family Service", () => {
    describe("createFamily", () => {
        it("should create a family with the user as creator and manager", async () => {
            await withTestTransaction(async (tx: TestTransaction) => {
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
            await withTestTransaction(async (tx: TestTransaction) => {
                // Test with invalid user ID (non-existent)
                await expect(
                    createFamily(tx, "non-existent-user-id", {
                        name: "Test Family",
                    }),
                ).rejects.toThrow();
            });
        });

        it("should create multiple families for the same user", async () => {
            await withTestTransaction(async (tx: TestTransaction) => {
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

    describe("Authorization", () => {
        describe("createFamily", () => {
            describe("Unauthenticated Access", () => {
                it("should throw UnauthorizedError when userId is not provided (empty string)", async () => {
                    await withTestTransaction(async (tx: TestTransaction) => {
                        await expect(
                            createFamily(tx, "", { name: "Test Family" }),
                        ).rejects.toThrow(UnauthorizedError);
                    });
                });

                it("should throw UnauthorizedError when userId is null", async () => {
                    await withTestTransaction(async (tx: TestTransaction) => {
                        await expect(
                            createFamily(tx, null as unknown as string, {
                                name: "Test Family",
                            }),
                        ).rejects.toThrow(UnauthorizedError);
                    });
                });

                it("should throw UnauthorizedError when userId is undefined", async () => {
                    await withTestTransaction(async (tx: TestTransaction) => {
                        await expect(
                            createFamily(tx, undefined as unknown as string, {
                                name: "Test Family",
                            }),
                        ).rejects.toThrow(UnauthorizedError);
                    });
                });
            });
        });

        describe("transferOwnership", () => {
            describe("Insufficient Permissions", () => {
                it("should throw ForbiddenError when user is a regular member (not creator)", async () => {
                    await withTestTransaction(async (tx: TestTransaction) => {
                        const creator = await createTestUser(tx, {
                            email: "creator@example.com",
                            username: "creator",
                        });
                        const family = await createTestFamily(tx, creator.id);

                        // Add a regular member
                        const member = await createTestUser(tx, {
                            email: "member@example.com",
                            username: "member",
                        });
                        await tx.insert(familyMembers).values({
                            family_id: family.id,
                            user_id: member.id,
                            role: "member",
                        });

                        // Add another user as potential new owner
                        const newOwner = await createTestUser(tx, {
                            email: "newowner@example.com",
                            username: "newowner",
                        });
                        await tx.insert(familyMembers).values({
                            family_id: family.id,
                            user_id: newOwner.id,
                            role: "member",
                        });

                        // Member trying to transfer ownership should fail
                        await expect(
                            transferOwnership(
                                tx,
                                member.id,
                                family.id,
                                newOwner.id,
                            ),
                        ).rejects.toThrow(ForbiddenError);
                    });
                });

                it("should throw ForbiddenError when user is a manager (not creator)", async () => {
                    await withTestTransaction(async (tx: TestTransaction) => {
                        const creator = await createTestUser(tx, {
                            email: "creator@example.com",
                            username: "creator",
                        });
                        const family = await createTestFamily(tx, creator.id);

                        // Add a manager (not the creator)
                        const manager = await createTestUser(tx, {
                            email: "manager@example.com",
                            username: "manager",
                        });
                        await tx.insert(familyMembers).values({
                            family_id: family.id,
                            user_id: manager.id,
                            role: "manager",
                        });

                        // Add another user as potential new owner
                        const newOwner = await createTestUser(tx, {
                            email: "newowner@example.com",
                            username: "newowner",
                        });
                        await tx.insert(familyMembers).values({
                            family_id: family.id,
                            user_id: newOwner.id,
                            role: "member",
                        });

                        // Manager trying to transfer ownership should fail
                        await expect(
                            transferOwnership(
                                tx,
                                manager.id,
                                family.id,
                                newOwner.id,
                            ),
                        ).rejects.toThrow(ForbiddenError);
                    });
                });
            });

            describe("Resource Ownership", () => {
                it("should throw ForbiddenError when user is not the family creator", async () => {
                    await withTestTransaction(async (tx: TestTransaction) => {
                        const creator = await createTestUser(tx, {
                            email: "creator@example.com",
                            username: "creator",
                        });
                        const family = await createTestFamily(tx, creator.id);

                        // Create a different user who is not part of this family
                        const otherUser = await createTestUser(tx, {
                            email: "other@example.com",
                            username: "other",
                        });

                        // Create a potential new owner
                        const newOwner = await createTestUser(tx, {
                            email: "newowner@example.com",
                            username: "newowner",
                        });
                        await tx.insert(familyMembers).values({
                            family_id: family.id,
                            user_id: newOwner.id,
                            role: "member",
                        });

                        // Other user trying to transfer ownership should fail
                        await expect(
                            transferOwnership(
                                tx,
                                otherUser.id,
                                family.id,
                                newOwner.id,
                            ),
                        ).rejects.toThrow(ForbiddenError);
                    });
                });

                it("should allow creator to transfer ownership", async () => {
                    await withTestTransaction(async (tx: TestTransaction) => {
                        const creator = await createTestUser(tx, {
                            email: "creator@example.com",
                            username: "creator",
                        });
                        const family = await createTestFamily(tx, creator.id);

                        const newOwner = await createTestUser(tx, {
                            email: "newowner@example.com",
                            username: "newowner",
                        });
                        await tx.insert(familyMembers).values({
                            family_id: family.id,
                            user_id: newOwner.id,
                            role: "member",
                        });

                        const result = await transferOwnership(
                            tx,
                            creator.id,
                            family.id,
                            newOwner.id,
                        );

                        expect(result).toEqual({ success: true });
                        const updatedFamily = await tx.query.families.findFirst(
                            {
                                where: eq(families.id, family.id),
                            },
                        );
                        expect(updatedFamily?.creator_id).toBe(newOwner.id);
                    });
                });
            });

            describe("Cross-Family Access Prevention", () => {
                it("should throw ForbiddenError when user is creator of different family", async () => {
                    await withTestTransaction(async (tx: TestTransaction) => {
                        // Create first family and its creator
                        const creator1 = await createTestUser(tx, {
                            email: "creator1@example.com",
                            username: "creator1",
                        });
                        await createTestFamily(tx, creator1.id, {
                            name: "Family 1",
                        });

                        // Create second family
                        const creator2 = await createTestUser(tx, {
                            email: "creator2@example.com",
                            username: "creator2",
                        });
                        const family2 = await createTestFamily(
                            tx,
                            creator2.id,
                            {
                                name: "Family 2",
                            },
                        );

                        // Add member to family2
                        const newOwner = await createTestUser(tx, {
                            email: "newowner@example.com",
                            username: "newowner",
                        });
                        await tx.insert(familyMembers).values({
                            family_id: family2.id,
                            user_id: newOwner.id,
                            role: "member",
                        });

                        // Creator1 trying to transfer ownership of family2 should fail
                        await expect(
                            transferOwnership(
                                tx,
                                creator1.id,
                                family2.id,
                                newOwner.id,
                            ),
                        ).rejects.toThrow(ForbiddenError);
                    });
                });

                it("should allow creator to only transfer ownership of their own family", async () => {
                    await withTestTransaction(async (tx: TestTransaction) => {
                        // Create two families
                        const creator1 = await createTestUser(tx, {
                            email: "creator1@example.com",
                            username: "creator1",
                        });
                        const family1 = await createTestFamily(
                            tx,
                            creator1.id,
                            {
                                name: "Family 1",
                            },
                        );

                        const creator2 = await createTestUser(tx, {
                            email: "creator2@example.com",
                            username: "creator2",
                        });
                        const family2 = await createTestFamily(
                            tx,
                            creator2.id,
                            {
                                name: "Family 2",
                            },
                        );

                        // Add member to family1
                        const newOwner1 = await createTestUser(tx, {
                            email: "newowner1@example.com",
                            username: "newowner1",
                        });
                        await tx.insert(familyMembers).values({
                            family_id: family1.id,
                            user_id: newOwner1.id,
                            role: "member",
                        });

                        // Creator1 should be able to transfer ownership of family1
                        const result = await transferOwnership(
                            tx,
                            creator1.id,
                            family1.id,
                            newOwner1.id,
                        );

                        expect(result).toEqual({ success: true });
                        const updatedFamily1 =
                            await tx.query.families.findFirst({
                                where: eq(families.id, family1.id),
                            });
                        expect(updatedFamily1?.creator_id).toBe(newOwner1.id);

                        // But family2 should still be owned by creator2
                        const unchangedFamily2 =
                            await tx.query.families.findFirst({
                                where: eq(families.id, family2.id),
                            });
                        expect(unchangedFamily2?.creator_id).toBe(creator2.id);
                    });
                });
            });

            describe("Role-Based Access", () => {
                it("should enforce that only creator can transfer (not manager role)", async () => {
                    await withTestTransaction(async (tx: TestTransaction) => {
                        const creator = await createTestUser(tx, {
                            email: "creator@example.com",
                            username: "creator",
                        });
                        const family = await createTestFamily(tx, creator.id);

                        // Add a manager who is not the creator
                        const manager = await createTestUser(tx, {
                            email: "manager@example.com",
                            username: "manager",
                        });
                        await tx.insert(familyMembers).values({
                            family_id: family.id,
                            user_id: manager.id,
                            role: "manager",
                        });

                        // Add potential new owner
                        const newOwner = await createTestUser(tx, {
                            email: "newowner@example.com",
                            username: "newowner",
                        });
                        await tx.insert(familyMembers).values({
                            family_id: family.id,
                            user_id: newOwner.id,
                            role: "member",
                        });

                        // Manager should not be able to transfer
                        await expect(
                            transferOwnership(
                                tx,
                                manager.id,
                                family.id,
                                newOwner.id,
                            ),
                        ).rejects.toThrow(ForbiddenError);

                        // But creator should be able to transfer
                        const result = await transferOwnership(
                            tx,
                            creator.id,
                            family.id,
                            newOwner.id,
                        );
                        expect(result).toEqual({ success: true });
                    });
                });
            });

            describe("Soft-Deleted Resources", () => {
                it("should throw NotFoundError when transferring ownership of a soft-deleted family", async () => {
                    await withTestTransaction(async (tx: TestTransaction) => {
                        const creator = await createTestUser(tx, {
                            email: "creator@example.com",
                            username: "creator",
                        });
                        const family = await createTestFamily(tx, creator.id);
                        const member = await createTestUser(tx, {
                            email: "member@example.com",
                            username: "member",
                        });
                        await tx.insert(familyMembers).values({
                            family_id: family.id,
                            user_id: member.id,
                            role: "member",
                        });

                        // Soft-delete the family
                        await tx
                            .update(families)
                            .set({ deleted_at: new Date() })
                            .where(eq(families.id, family.id));

                        await expect(
                            transferOwnership(
                                tx,
                                creator.id,
                                family.id,
                                member.id,
                            ),
                        ).rejects.toThrow(NotFoundError);
                    });
                });

                it("should throw ValidationError when soft-deleted member is designated as new owner", async () => {
                    await withTestTransaction(async (tx: TestTransaction) => {
                        const creator = await createTestUser(tx, {
                            email: "creator@example.com",
                            username: "creator",
                        });
                        const family = await createTestFamily(tx, creator.id);
                        const member = await createTestUser(tx, {
                            email: "member@example.com",
                            username: "member",
                        });
                        await tx.insert(familyMembers).values({
                            family_id: family.id,
                            user_id: member.id,
                            role: "member",
                        });

                        // Soft-delete the member's familyMembers row
                        await tx
                            .update(familyMembers)
                            .set({ deleted_at: new Date() })
                            .where(
                                and(
                                    eq(familyMembers.family_id, family.id),
                                    eq(familyMembers.user_id, member.id),
                                ),
                            );

                        await expect(
                            transferOwnership(
                                tx,
                                creator.id,
                                family.id,
                                member.id,
                            ),
                        ).rejects.toThrow(ValidationError);
                    });
                });
            });

            describe("Business Rule Validation", () => {
                it("should throw ValidationError when new owner is not a family member", async () => {
                    await withTestTransaction(async (tx: TestTransaction) => {
                        const creator = await createTestUser(tx, {
                            email: "creator@example.com",
                            username: "creator",
                        });
                        const family = await createTestFamily(tx, creator.id);

                        // Create a user who is NOT a family member
                        const nonMember = await createTestUser(tx, {
                            email: "nonmember@example.com",
                            username: "nonmember",
                        });

                        // Attempting to transfer to non-member should fail
                        await expect(
                            transferOwnership(
                                tx,
                                creator.id,
                                family.id,
                                nonMember.id,
                            ),
                        ).rejects.toThrow(ValidationError);
                    });
                });

                it("should successfully transfer ownership when new owner is a member", async () => {
                    await withTestTransaction(async (tx: TestTransaction) => {
                        const creator = await createTestUser(tx, {
                            email: "creator@example.com",
                            username: "creator",
                        });
                        const family = await createTestFamily(tx, creator.id);

                        // Add a member
                        const member = await createTestUser(tx, {
                            email: "member@example.com",
                            username: "member",
                        });
                        await tx.insert(familyMembers).values({
                            family_id: family.id,
                            user_id: member.id,
                            role: "member",
                        });

                        // Transfer should succeed
                        const result = await transferOwnership(
                            tx,
                            creator.id,
                            family.id,
                            member.id,
                        );

                        expect(result).toEqual({ success: true });
                        const updatedFamily = await tx.query.families.findFirst(
                            {
                                where: eq(families.id, family.id),
                            },
                        );
                        expect(updatedFamily?.creator_id).toBe(member.id);
                    });
                });
            });
        });
    });

    describe("Input Validation", () => {
        describe("createFamily", () => {
            it("should throw ValidationError if family name is less than 3 characters", async () => {
                await withTestTransaction(async (tx: TestTransaction) => {
                    const user = await createTestUser(tx);
                    await expect(
                        createFamily(tx, user.id, { name: "ab" }),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should throw ValidationError if family name exceeds maximum length (100 characters)", async () => {
                await withTestTransaction(async (tx: TestTransaction) => {
                    const user = await createTestUser(tx);
                    const longName = "a".repeat(101); // Max length is 100
                    await expect(
                        createFamily(tx, user.id, { name: longName }),
                    ).rejects.toThrow(ValidationError);
                });
            });
        });
    });

    describe("Edge Cases", () => {
        describe("Non-Existent Resources", () => {
            it("should throw NotFoundError when transferring ownership of a non-existent family", async () => {
                await withTestTransaction(async (tx: TestTransaction) => {
                    const user = await createTestUser(tx);
                    const anotherUser = await createTestUser(tx);
                    await expect(
                        transferOwnership(
                            tx,
                            user.id,
                            "00000000-0000-0000-0000-000000000000", // Non-existent UUID
                            anotherUser.id,
                        ),
                    ).rejects.toThrow(NotFoundError);
                });
            });

            it("should throw NotFoundError when transferring ownership to a non-existent user", async () => {
                await withTestTransaction(async (tx: TestTransaction) => {
                    const user = await createTestUser(tx);
                    const family = await createTestFamily(tx, user.id);
                    await expect(
                        transferOwnership(
                            tx,
                            user.id,
                            family.id,
                            "00000000-0000-0000-0000-000000000000", // Non-existent UUID
                        ),
                    ).rejects.toThrow(NotFoundError);
                });
            });

            it("should throw ValidationError when transferring ownership with invalid UUID", async () => {
                await withTestTransaction(async (tx: TestTransaction) => {
                    const user = await createTestUser(tx);
                    const anotherUser = await createTestUser(tx);
                    await expect(
                        transferOwnership(
                            tx,
                            user.id,
                            "invalid-uuid",
                            anotherUser.id,
                        ),
                    ).rejects.toThrow(ValidationError);
                });
            });
        });

        describe("Empty Collections", () => {
            it("should return an empty array when a user has no families", async () => {
                // This test requires a getUserFamilies function, which doesn't exist yet.
            });

            it("should return an array with only the creator for a new family", async () => {
                // This test requires a getFamilyMembers function, which doesn't exist yet.
            });
        });

        describe("Unicode and Special Characters", () => {
            it("should create a family with Unicode and special characters in the name", async () => {
                await withTestTransaction(async (tx: TestTransaction) => {
                    const user = await createTestUser(tx);
                    const specialName = "Familie Müller 🎉-ケーニッヒ";
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
});
