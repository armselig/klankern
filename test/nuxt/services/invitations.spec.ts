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
import { and, eq } from "drizzle-orm";
import { familyMembers, families, familyInvitations } from "#server/db/schema";
import {
    ForbiddenError,
    ConflictError,
    UnauthorizedError,
    ValidationError,
    NotFoundError,
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

            it("should throw NotFoundError when creating invitation for a soft-deleted family", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family, managers } = await createFamilyWithMembers(
                        tx,
                        creator,
                        { managers: 1 },
                    );
                    const manager = managers[0];

                    // Soft-delete the family
                    await tx
                        .update(families)
                        .set({ deleted_at: new Date() })
                        .where(eq(families.id, family.id));

                    await expect(
                        createInvitation(
                            tx,
                            manager.user.id,
                            family.id,
                            "new.member@example.com",
                        ),
                    ).rejects.toThrow(NotFoundError);
                });
            });

            it("should prevent a soft-deleted manager from creating an invitation", async () => {
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

                    // Soft-delete the manager's membership
                    await tx
                        .update(familyMembers)
                        .set({ deleted_at: new Date() })
                        .where(
                            and(
                                eq(familyMembers.family_id, family.id),
                                eq(familyMembers.user_id, manager.user.id),
                            ),
                        );

                    await expect(
                        createInvitation(
                            tx,
                            manager.user.id,
                            family.id,
                            "new.member@example.com",
                        ),
                    ).rejects.toThrow(ForbiddenError);
                });
            });
        });

        describe("Input Validation", () => {
            it("should reject empty email", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family, managers } = await createFamilyWithMembers(
                        tx,
                        creator,
                        { managers: 1 },
                    );
                    const manager = managers[0];

                    await expect(
                        createInvitation(tx, manager.user.id, family.id, ""),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should reject invalid email format", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family, managers } = await createFamilyWithMembers(
                        tx,
                        creator,
                        { managers: 1 },
                    );
                    const manager = managers[0];

                    const invalidEmails = [
                        "notanemail",
                        "@example.com",
                        "user@",
                        "user@.com",
                        "user..name@example.com",
                    ];

                    for (const email of invalidEmails) {
                        await expect(
                            createInvitation(
                                tx,
                                manager.user.id,
                                family.id,
                                email,
                            ),
                        ).rejects.toThrow(ValidationError);
                    }
                });
            });

            it("should reject email exceeding max length", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family, managers } = await createFamilyWithMembers(
                        tx,
                        creator,
                        { managers: 1 },
                    );
                    const manager = managers[0];

                    const longEmail = "a".repeat(245) + "@example.com"; // > 255 chars

                    await expect(
                        createInvitation(
                            tx,
                            manager.user.id,
                            family.id,
                            longEmail,
                        ),
                    ).rejects.toThrow(ValidationError);
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

            it("should throw ValidationError when accepting a soft-deleted invitation", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family, managers } = await createFamilyWithMembers(
                        tx,
                        creator,
                        { managers: 1 },
                    );
                    const manager = managers[0];
                    const invitedUser = await createTestUser(tx);

                    const { token } = await createInvitation(
                        tx,
                        manager.user.id,
                        family.id,
                        invitedUser.email,
                    );

                    // Soft-delete the invitation
                    await tx
                        .update(familyInvitations)
                        .set({ deleted_at: new Date() })
                        .where(eq(familyInvitations.token, token));

                    await expect(
                        acceptInvitation(tx, invitedUser.id, token),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should reject invitation if accepting user email does not match invited email", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family, managers } = await createFamilyWithMembers(
                        tx,
                        creator,
                        { managers: 1 },
                    );
                    const manager = managers[0];

                    // Invite user A
                    const invitedEmail = "user.a@example.com";
                    const { token } = await createInvitation(
                        tx,
                        manager.user.id,
                        family.id,
                        invitedEmail,
                    );

                    // Try to accept with user B
                    const userB = await createTestUser(tx, {
                        email: "user.b@example.com",
                        username: "userb",
                    });

                    await expect(
                        acceptInvitation(tx, userB.id, token),
                    ).rejects.toThrow(ValidationError);
                });
            });
        });
    });

    describe("Edge Cases", () => {
        describe("Non-Existent Resources", () => {
            it("should throw a ValidationError when accepting a non-existent invitation token", async () => {
                await withTestTransaction(async (tx) => {
                    const user = await createTestUser(tx);
                    await expect(
                        acceptInvitation(tx, user.id, "non-existent-token"),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should throw ValidationError when creating invitation for family with invalid UUID", async () => {
                await withTestTransaction(async (tx) => {
                    const user = await createTestUser(tx);
                    await expect(
                        createInvitation(
                            tx,
                            user.id,
                            "invalid-uuid",
                            "test@example.com",
                        ),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should throw a NotFoundError when creating an invitation for a non-existent family", async () => {
                await withTestTransaction(async (tx) => {
                    const user = await createTestUser(tx);
                    await expect(
                        createInvitation(
                            tx,
                            user.id,
                            "00000000-0000-0000-0000-000000000000",
                            "test@example.com",
                        ),
                    ).rejects.toThrow(NotFoundError);
                });
            });

            it.todo(
                "should return undefined when getting an invitation by a non-existent token",
                async () => {
                    // This test requires a getInvitationByToken function which does not exist yet.
                    // await withTestTransaction(async (tx) => {
                    //     const result = await getInvitationByToken(tx, "non-existent-token");
                    //     expect(result).toBeUndefined();
                    // });
                },
            );
        });

        describe("Operations on Used/Expired Invitations", () => {
            it("should throw a ValidationError when accepting an already used invitation", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family, managers } = await createFamilyWithMembers(
                        tx,
                        creator,
                        { managers: 1 },
                    );
                    const manager = managers[0];
                    const invitedUser = await createTestUser(tx);
                    const { token } = await createInvitation(
                        tx,
                        manager.user.id,
                        family.id,
                        invitedUser.email,
                    );

                    await acceptInvitation(tx, invitedUser.id, token);

                    await expect(
                        acceptInvitation(tx, invitedUser.id, token),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should throw a ValidationError when accepting an expired invitation", async () => {
                await withTestTransaction(async (tx) => {
                    const creator = await createTestUser(tx);
                    const { family, managers } = await createFamilyWithMembers(
                        tx,
                        creator,
                        { managers: 1 },
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
        });
    });
});
