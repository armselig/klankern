import { describe, expect, it } from "vitest";
import {
    withTestTransaction,
    createTestUser,
    createTestFamily,
} from "#test/utils";
import { createInvitation } from "#server/services/invitations";
import { eq, and } from "drizzle-orm";
import { familyInvitations, familyMembers } from "~~/server/db/schema";
import {
    ForbiddenError,
    ConflictError,
    UnauthorizedError,
} from "#server/lib/errors";

describe("Family Invitations Service", () => {
    describe("createInvitation", () => {
        it("should throw UnauthorizedError if user is not authenticated", async () => {
            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx);
                const family = await createTestFamily(tx, user.id);
                await expect(
                    createInvitation(
                        tx,
                        null,
                        family.id,
                        "invited@example.com",
                    ),
                ).rejects.toThrow(UnauthorizedError);
            });
        });

        it("should throw ForbiddenError if user is not a manager", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create family with a manager
                const manager = await createTestUser(tx, {
                    email: "manager@example.com",
                    username: "manager",
                });
                const family = await createTestFamily(tx, manager.id);

                // 2. Setup: Create a regular member
                const member = await createTestUser(tx, {
                    email: "member@example.com",
                    username: "member",
                });
                await tx.insert(familyMembers).values({
                    family_id: family.id,
                    user_id: member.id,
                    role: "member", // Not a manager
                });

                // 3. Action & Assertion: Regular member trying to invite should fail
                await expect(
                    createInvitation(
                        tx,
                        member.id,
                        family.id,
                        "invited@example.com",
                    ),
                ).rejects.toThrow(ForbiddenError);
            });
        });

        it("should throw ConflictError if invited email is already a member", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create family with a manager
                const manager = await createTestUser(tx, {
                    email: "manager@example.com",
                    username: "manager",
                });
                const family = await createTestFamily(tx, manager.id);

                // 2. Setup: Create an existing member
                const existingMember = await createTestUser(tx, {
                    email: "existing@example.com",
                    username: "existing",
                });
                await tx.insert(familyMembers).values({
                    family_id: family.id,
                    user_id: existingMember.id,
                    role: "member",
                });

                // 3. Action & Assertion: Inviting existing member should fail
                await expect(
                    createInvitation(
                        tx,
                        manager.id,
                        family.id,
                        "existing@example.com",
                    ),
                ).rejects.toThrow(ConflictError);
            });
        });

        it("should successfully create an invitation", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create family with a manager
                const manager = await createTestUser(tx, {
                    email: "manager@example.com",
                    username: "manager",
                });
                const family = await createTestFamily(tx, manager.id, {
                    name: "Test Family",
                });

                // 2. Action: Create invitation
                const invitedEmail = "newmember@example.com";
                const result = await createInvitation(
                    tx,
                    manager.id,
                    family.id,
                    invitedEmail,
                );

                // 3. Assertion: Verify result
                expect(result).toBeDefined();
                expect(result.token).toBeDefined();
                expect(result.expires_at).toBeDefined();
                expect(result.family_name).toBe("Test Family");

                // 4. Assertion: Verify database state
                const invitation = await tx.query.familyInvitations.findFirst({
                    where: and(
                        eq(familyInvitations.family_id, family.id),
                        eq(familyInvitations.invited_email, invitedEmail),
                    ),
                });
                expect(invitation).toBeDefined();
                expect(invitation?.invited_by_user_id).toBe(manager.id);
                expect(invitation?.token).toBe(result.token);
                expect(invitation?.invited_email).toBe(invitedEmail);

                // Verify expiration is ~7 days from now
                const daysDiff =
                    (invitation!.expires_at.getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24);
                expect(daysDiff).toBeGreaterThan(6.9);
                expect(daysDiff).toBeLessThan(7.1);
            });
        });

        it("should allow inviting the same email to different families", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create two families with managers
                const manager1 = await createTestUser(tx, {
                    email: "manager1@example.com",
                    username: "manager1",
                });
                const family1 = await createTestFamily(tx, manager1.id, {
                    name: "Family 1",
                });

                const manager2 = await createTestUser(tx, {
                    email: "manager2@example.com",
                    username: "manager2",
                });
                const family2 = await createTestFamily(tx, manager2.id, {
                    name: "Family 2",
                });

                // 2. Action: Invite same email to both families
                const invitedEmail = "shared@example.com";
                const invitation1 = await createInvitation(
                    tx,
                    manager1.id,
                    family1.id,
                    invitedEmail,
                );
                const invitation2 = await createInvitation(
                    tx,
                    manager2.id,
                    family2.id,
                    invitedEmail,
                );

                // 3. Assertion: Both invitations should be created
                expect(invitation1.token).not.toBe(invitation2.token);
                expect(invitation1.family_name).toBe("Family 1");
                expect(invitation2.family_name).toBe("Family 2");

                // 4. Verify both invitations in database
                const allInvitations =
                    await tx.query.familyInvitations.findMany({
                        where: eq(
                            familyInvitations.invited_email,
                            invitedEmail,
                        ),
                    });
                expect(allInvitations.length).toBe(2);
            });
        });
    });
});
