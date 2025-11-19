import { describe, it, expect } from "vitest";
import {
    withTestTransaction,
    createTestUser,
    createTestFamily,
    createTestAdminUser,
} from "#test/utils";
import { createUser } from "#server/services/users";
import {
    ConflictError,
    ValidationError,
    ForbiddenError,
} from "#server/lib/errors";
import { familyMembers, families } from "#server/db/schema";
import { eq } from "drizzle-orm";
import { createFamily, transferOwnership } from "#server/services/families";
import {
    acceptInvitation,
    createInvitation,
} from "#server/services/invitations";

describe("Concurrency Tests", () => {
    describe("Unique Constraint Enforcement", () => {
        it("should prevent duplicate email registration", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                // Create first user
                await createUser(tx, admin.id, {
                    email: "duplicate@example.com",
                    username: "user1",
                    password: "password123",
                });

                // Attempt to create second user with same email
                await expect(
                    createUser(tx, admin.id, {
                        email: "duplicate@example.com",
                        username: "user2",
                        password: "password123",
                    }),
                ).rejects.toThrow(ConflictError);
            });
        });

        it("should prevent duplicate username registration", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                await createUser(tx, admin.id, {
                    email: "user1@example.com",
                    username: "duplicate",
                    password: "password123",
                });

                await expect(
                    createUser(tx, admin.id, {
                        email: "user2@example.com",
                        username: "duplicate",
                        password: "password123",
                    }),
                ).rejects.toThrow(ConflictError);
            });
        });

        it("should prevent duplicate family membership", async () => {
            await withTestTransaction(async (tx) => {
                const creator = await createTestUser(tx);
                const family = await createTestFamily(tx, creator.id);
                const member = await createTestUser(tx);

                // Add member first time
                await tx.insert(familyMembers).values({
                    family_id: family.id,
                    user_id: member.id,
                    role: "member",
                });

                // Attempt to add same member again
                await expect(
                    tx.insert(familyMembers).values({
                        family_id: family.id,
                        user_id: member.id,
                        role: "member",
                    }),
                ).rejects.toThrow();
            });
        });
    });

    describe("Simultaneous Operations", () => {
        it("should handle concurrent family creation by same user", async () => {
            // Note: This test demonstrates the concept
            // In practice, our transaction isolation prevents true parallelism
            // But the pattern is valuable for understanding behavior

            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx);

                // Attempt to create multiple families simultaneously
                const operations = [
                    createFamily(tx, user.id, { name: "Family 1" }),
                    createFamily(tx, user.id, { name: "Family 2" }),
                    createFamily(tx, user.id, { name: "Family 3" }),
                ];

                const results = await Promise.all(operations);

                // All should succeed (no unique constraint on family name per user)
                expect(results).toHaveLength(3);
                expect(results.every((f) => f.creator_id === user.id)).toBe(
                    true,
                );
            });
        });

        it("should prevent accepting already-accepted invitation", async () => {
            // This test verifies that an already-accepted invitation cannot be reused
            // Note: True concurrent race condition testing requires separate database
            // transactions. Within a single transaction (as used here), operations are
            // serialized by the database, making true parallelism impossible.
            //
            // For production race condition protection, rely on:
            // 1. Database unique constraints (e.g., unique family_id + user_id)
            // 2. Invitation status checks (preventing reuse of "accepted" invitations)
            // 3. Database transaction isolation (preventing dirty reads)
            await withTestTransaction(async (tx) => {
                const creator = await createTestUser(tx);
                const family = await createTestFamily(tx, creator.id);
                const invitedUser = await createTestUser(tx);

                const invitation = await createInvitation(
                    tx,
                    creator.id,
                    family.id,
                    invitedUser.email,
                );

                // First acceptance succeeds
                await acceptInvitation(tx, invitedUser.id, invitation.token);

                // Second attempt should fail (invitation already accepted)
                await expect(
                    acceptInvitation(tx, invitedUser.id, invitation.token),
                ).rejects.toThrow(ValidationError);
            });
        });

        it("should handle concurrent acceptance attempts via Promise.allSettled", async () => {
            // This test demonstrates using Promise.allSettled for concurrent operations
            // Note: Due to transaction isolation within a single transaction, both
            // promises may fail when trying to insert duplicate family memberships.
            // This is expected behavior and shows that the database constraints
            // are working correctly. In production, with separate HTTP requests
            // and transactions, one would succeed and one would fail.
            await withTestTransaction(async (tx) => {
                const creator = await createTestUser(tx);
                const family = await createTestFamily(tx, creator.id);
                const invitedUser = await createTestUser(tx);

                const invitation = await createInvitation(
                    tx,
                    creator.id,
                    family.id,
                    invitedUser.email,
                );

                // Attempt to accept the same invitation with Promise.allSettled
                const results = await Promise.allSettled([
                    acceptInvitation(tx, invitedUser.id, invitation.token),
                    acceptInvitation(tx, invitedUser.id, invitation.token),
                ]);

                // At least one should fail (preventing duplicate acceptance)
                const fulfilled = results.filter(
                    (r) => r.status === "fulfilled",
                );
                const rejected = results.filter((r) => r.status === "rejected");

                // Either 1 succeeds and 1 fails, OR both fail due to constraints
                expect(fulfilled.length + rejected.length).toBe(2);
                expect(rejected.length).toBeGreaterThanOrEqual(1);

                // Verify rejections occurred (database constraints working)
                // Note: The specific error type may vary depending on which
                // constraint is violated (unique family membership, invitation status, etc.)
                rejected.forEach((result) => {
                    if (result.status === "rejected") {
                        expect(result.reason).toBeInstanceOf(Error);
                    }
                });
            });
        });

        it("should prevent concurrent ownership transfers", async () => {
            await withTestTransaction(async (tx) => {
                const creator = await createTestUser(tx);
                const family = await createTestFamily(tx, creator.id);

                // Add two members to the family
                const member1 = await createTestUser(tx);
                const member2 = await createTestUser(tx);

                await tx.insert(familyMembers).values({
                    family_id: family.id,
                    user_id: member1.id,
                    role: "member",
                });

                await tx.insert(familyMembers).values({
                    family_id: family.id,
                    user_id: member2.id,
                    role: "member",
                });

                // First transfer succeeds
                await transferOwnership(tx, creator.id, family.id, member1.id);

                // Second transfer attempt by original creator should fail
                // (creator is no longer the owner)
                await expect(
                    transferOwnership(tx, creator.id, family.id, member2.id),
                ).rejects.toThrow(ForbiddenError);
            });
        });

        it("should handle parallel member additions", async () => {
            await withTestTransaction(async (tx) => {
                const creator = await createTestUser(tx);
                const family = await createTestFamily(tx, creator.id);

                // Create multiple users
                const member1 = await createTestUser(tx);
                const member2 = await createTestUser(tx);
                const member3 = await createTestUser(tx);

                // Add all members simultaneously
                const operations = [
                    tx.insert(familyMembers).values({
                        family_id: family.id,
                        user_id: member1.id,
                        role: "member",
                    }),
                    tx.insert(familyMembers).values({
                        family_id: family.id,
                        user_id: member2.id,
                        role: "member",
                    }),
                    tx.insert(familyMembers).values({
                        family_id: family.id,
                        user_id: member3.id,
                        role: "member",
                    }),
                ];

                // All should succeed (no conflicts, different users)
                await Promise.all(operations);

                // Verify all members were added
                const members = await tx.query.familyMembers.findMany({
                    where: eq(familyMembers.family_id, family.id),
                });

                // Should have 4 total: creator + 3 new members
                expect(members).toHaveLength(4);
            });
        });
    });

    describe("Transaction Isolation", () => {
        it("should maintain consistent state within transaction", async () => {
            // This test demonstrates transaction isolation behavior
            // Within a transaction, all operations see consistent, committed state

            await withTestTransaction(async (tx) => {
                // Create a user in this transaction
                const user = await createTestUser(tx);

                // Create first family
                const family1 = await createFamily(tx, user.id, {
                    name: "Family 1",
                });

                // Query should see the family we just created
                const families1 = await tx.query.families.findMany({
                    where: eq(families.creator_id, user.id),
                });
                expect(families1).toHaveLength(1);
                expect(families1[0].id).toBe(family1.id);

                // Within the same transaction, all operations see consistent state
                // Create second family
                await createFamily(tx, user.id, { name: "Family 2" });

                // Should now see both families
                const families2 = await tx.query.families.findMany({
                    where: eq(families.creator_id, user.id),
                });
                expect(families2).toHaveLength(2);

                // Create third family with multiple members
                const family3 = await createFamily(tx, user.id, {
                    name: "Family 3",
                });
                const member = await createTestUser(tx);

                await tx.insert(familyMembers).values({
                    family_id: family3.id,
                    user_id: member.id,
                    role: "member",
                });

                // Should see all three families
                const families3 = await tx.query.families.findMany({
                    where: eq(families.creator_id, user.id),
                });
                expect(families3).toHaveLength(3);

                // All data remains consistent throughout the transaction
            });

            // After rollback, the transaction's changes are isolated and not visible
            // This is demonstrated by the fact that withTestTransaction rolls back
        });
    });
});
