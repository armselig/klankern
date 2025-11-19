import { describe, it, expect } from "vitest";
import { withTestTransaction } from "#test/utils/db";
import {
    createFamilyWithMembers,
    createTestUser,
    createExpiredInvitation,
} from "#test/utils/fixtures";
import {
    createInvitation,
    acceptInvitation,
} from "#server/services/invitations";
import {
    ForbiddenError,
    ConflictError,
    UnauthorizedError,
    ValidationError,
} from "#server/lib/errors";

describe("invitations service", () => {
    describe("createInvitation", () => {
        describe("Authorization", () => {
            it("should throw UnauthorizedError when user is not authenticated", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family } = await createFamilyWithMembers(
                        tx,
                        creator,
                    );

                    await expect(
                        createInvitation(
                            tx,
                            null,
                            family.id,
                            "new.member@example.com",
                        ),
                    ).rejects.toThrow(UnauthorizedError);
                });
            });

            it("should allow a family manager to create an invitation", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family, managers } = await createFamilyWithMembers(
                        tx,
                        creator,
                        {
                            managers: 1,
                        },
                    );

                    const manager = managers[0];

                    const invitation = await createInvitation(
                        tx,
                        manager.user.id,
                        family.id,
                        "new.member@example.com",
                    );

                    expect(invitation).toBeDefined();
                    expect(invitation.token).toBeTypeOf("string");
                    expect(invitation.expires_at).toBeInstanceOf(Date);
                    expect(invitation.family_name).toBe(family.name);
                });
            });

            it("should prevent a regular member from creating an invitation", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family, regularMembers } =
                        await createFamilyWithMembers(tx, creator, {
                            members: 1,
                        });

                    const regularMember = regularMembers[0];

                    await expect(
                        createInvitation(
                            tx,
                            regularMember.user.id,
                            family.id,
                            "new.member@example.com",
                        ),
                    ).rejects.toThrow(ForbiddenError);
                });
            });

            it("should prevent a non-member from creating an invitation", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family } = await createFamilyWithMembers(
                        tx,
                        creator,
                    );
                    const nonMember = await createTestUser(tx);

                    await expect(
                        createInvitation(
                            tx,
                            nonMember.id,
                            family.id,
                            "new.member@example.com",
                        ),
                    ).rejects.toThrow(ForbiddenError);
                });
            });

            it("should prevent inviting a user who is already a member", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family, regularMembers, managers } =
                        await createFamilyWithMembers(tx, creator, {
                            members: 1,
                            managers: 1,
                        });
                    const manager = managers[0];
                    const regularMember = regularMembers[0];

                    await expect(
                        createInvitation(
                            tx,
                            manager.user.id,
                            family.id,
                            regularMember.user.email,
                        ),
                    ).rejects.toThrow(ConflictError);
                });
            });
        });

        describe("Invitation Token Security", () => {
            it("should generate unique tokens for each invitation", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family, managers } = await createFamilyWithMembers(
                        tx,
                        creator,
                        {
                            managers: 1,
                        },
                    );
                    const manager = managers[0];

                    const invitation1 = await createInvitation(
                        tx,
                        manager.user.id,
                        family.id,
                        "new.member1@example.com",
                    );

                    const invitation2 = await createInvitation(
                        tx,
                        manager.user.id,
                        family.id,
                        "new.member2@example.com",
                    );

                    expect(invitation1.token).not.toBe(invitation2.token);
                });
            });
        });
    });
    describe("acceptInvitation", () => {
        describe("Invitation Token Security", () => {
            it("should reject invitation with invalid token", async () => {
                await withTestTransaction(async (tx) => {
                    const user = await createTestUser(tx);

                    await expect(
                        acceptInvitation(tx, user.id, "invalid-token"),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should prevent accepting expired invitation", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family, managers } = await createFamilyWithMembers(
                        tx,
                        creator,
                        {
                            managers: 1,
                        },
                    );
                    const manager = managers[0];
                    const invitedUser = await createTestUser(tx);

                    const expiredInvitation = await createExpiredInvitation(
                        tx,
                        family.id,
                        manager.user.id,
                        { invitedEmail: invitedUser.email },
                    );

                    await expect(
                        acceptInvitation(
                            tx,
                            invitedUser.id,
                            expiredInvitation.token,
                        ),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should invalidate invitation after acceptance", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family, managers } = await createFamilyWithMembers(
                        tx,
                        creator,
                        {
                            managers: 1,
                        },
                    );
                    const manager = managers[0];
                    const invitedUser = await createTestUser(tx);

                    const { token } = await createInvitation(
                        tx,
                        manager.user.id,
                        family.id,
                        invitedUser.email,
                    );

                    // Accept invitation
                    await acceptInvitation(tx, invitedUser.id, token);

                    // Try to accept again (should fail)
                    await expect(
                        acceptInvitation(tx, invitedUser.id, token),
                    ).rejects.toThrow(ValidationError);
                });
            });
        });
    });
});
