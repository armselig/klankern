import { describe, expect, it } from "vitest";
import {
    withTestTransaction,
    createTestUser,
    createTestFamily,
} from "#test/utils";
import { transferOwnership } from "#server/services/families";
import { eq } from "drizzle-orm";
import { families, familyMembers } from "~~/server/db/schema";
import { ForbiddenError, ValidationError } from "#server/lib/errors";

describe("Family Ownership Transfer Service", () => {
    describe("transferOwnership", () => {
        it("should throw ForbiddenError if user is not the family creator", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create creator and family
                const creator = await createTestUser(tx, {
                    email: "creator@example.com",
                    username: "creator",
                });
                const family = await createTestFamily(tx, creator.id);

                // 2. Setup: Create a different user (not creator)
                const nonCreator = await createTestUser(tx, {
                    email: "other@example.com",
                    username: "other",
                });

                // 3. Setup: Create a potential new owner
                const newOwner = await createTestUser(tx, {
                    email: "newowner@example.com",
                    username: "newowner",
                });
                await tx.insert(familyMembers).values({
                    family_id: family.id,
                    user_id: newOwner.id,
                    role: "member",
                });

                // 4. Action & Assertion: Non-creator trying to transfer should fail
                await expect(
                    transferOwnership(
                        tx,
                        nonCreator.id,
                        family.id,
                        newOwner.id,
                    ),
                ).rejects.toThrow(ForbiddenError);
            });
        });

        it("should throw ValidationError if new owner is not a family member", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create creator and family
                const creator = await createTestUser(tx, {
                    email: "creator@example.com",
                    username: "creator",
                });
                const family = await createTestFamily(tx, creator.id);

                // 2. Setup: Create a user who is NOT a family member
                const nonMember = await createTestUser(tx, {
                    email: "nonmember@example.com",
                    username: "nonmember",
                });

                // 3. Action & Assertion: Transferring to non-member should fail
                await expect(
                    transferOwnership(tx, creator.id, family.id, nonMember.id),
                ).rejects.toThrow(ValidationError);
            });
        });

        it("should successfully transfer ownership", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create creator and family
                const creator = await createTestUser(tx, {
                    email: "creator@example.com",
                    username: "creator",
                });
                const family = await createTestFamily(tx, creator.id);

                // 2. Setup: Create new owner and add as member
                const newOwner = await createTestUser(tx, {
                    email: "newowner@example.com",
                    username: "newowner",
                });
                await tx.insert(familyMembers).values({
                    family_id: family.id,
                    user_id: newOwner.id,
                    role: "member",
                });

                // 3. Action: Transfer ownership
                const result = await transferOwnership(
                    tx,
                    creator.id,
                    family.id,
                    newOwner.id,
                );

                // 4. Assertion: Verify result
                expect(result).toEqual({ success: true });

                // 5. Assertion: Verify database state
                const updatedFamily = await tx.query.families.findFirst({
                    where: eq(families.id, family.id),
                });
                expect(updatedFamily?.creator_id).toBe(newOwner.id);
            });
        });

        it("should allow new owner to transfer ownership again", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create creator and family
                const creator = await createTestUser(tx);
                const family = await createTestFamily(tx, creator.id);

                // 2. Setup: Create first new owner
                const firstNewOwner = await createTestUser(tx);
                await tx.insert(familyMembers).values({
                    family_id: family.id,
                    user_id: firstNewOwner.id,
                    role: "member",
                });

                // 3. First transfer
                await transferOwnership(
                    tx,
                    creator.id,
                    family.id,
                    firstNewOwner.id,
                );

                // 4. Setup: Create second new owner
                const secondNewOwner = await createTestUser(tx);
                await tx.insert(familyMembers).values({
                    family_id: family.id,
                    user_id: secondNewOwner.id,
                    role: "member",
                });

                // 5. Action: Second transfer by first new owner
                const result = await transferOwnership(
                    tx,
                    firstNewOwner.id,
                    family.id,
                    secondNewOwner.id,
                );

                // 6. Assertion
                expect(result).toEqual({ success: true });
                const updatedFamily = await tx.query.families.findFirst({
                    where: eq(families.id, family.id),
                });
                expect(updatedFamily?.creator_id).toBe(secondNewOwner.id);
            });
        });
    });
});
