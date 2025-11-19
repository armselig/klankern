import { describe, it, expect } from "vitest";
import { withTestTransaction } from "#test/utils/db";
import { createFamilyWithMembers, createTestUser } from "#test/utils/fixtures";
import { createInvitation } from "#server/services/invitations";
import { ForbiddenError, ConflictError } from "#server/lib/errors";

describe("invitations service", () => {
    describe("createInvitation", () => {
        describe("Authorization", () => {
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
                        family.id,
                        manager.user.id,
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
                            family.id,
                            regularMember.user.id,
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
                            family.id,
                            nonMember.id,
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
                            family.id,
                            manager.user.id,
                            regularMember.user.email,
                        ),
                    ).rejects.toThrow(ConflictError);
                });
            });
        });
    });
});
