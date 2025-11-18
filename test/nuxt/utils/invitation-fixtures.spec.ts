import { describe, expect, it } from "vitest";
import { withTestTransaction } from "#test/utils";
import {
    createTestUser,
    createTestFamily,
    createValidInvitation,
    createExpiredInvitation,
    createUsedInvitation,
} from "#test/utils/fixtures";
import { familyInvitations } from "#server/db/schema";
import { eq } from "drizzle-orm";

describe("Invitation Test Fixtures", () => {
    describe("createValidInvitation", () => {
        it("should create a valid invitation with pending status", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create valid invitation
                const invitation = await createValidInvitation(
                    tx,
                    family.id,
                    manager.id,
                );

                // Assertions: Verify invitation properties
                expect(invitation).toBeDefined();
                expect(invitation.id).toBeDefined();
                expect(invitation.family_id).toBe(family.id);
                expect(invitation.invited_by_user_id).toBe(manager.id);
                expect(invitation.token).toBeDefined();
                expect(invitation.status).toBe("pending");
                expect(invitation.expires_at).toBeInstanceOf(Date);
            });
        });

        it("should create an invitation that expires in the future", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create valid invitation
                const invitation = await createValidInvitation(
                    tx,
                    family.id,
                    manager.id,
                );

                // Assertions: Verify expiration is in the future
                const now = new Date();
                expect(invitation.expires_at.getTime()).toBeGreaterThan(
                    now.getTime(),
                );

                // Verify it's approximately 7 days from now (default)
                const daysDiff =
                    (invitation.expires_at.getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24);
                expect(daysDiff).toBeGreaterThan(6.9);
                expect(daysDiff).toBeLessThan(7.1);
            });
        });

        it("should accept custom invited email", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);
                const customEmail = "custom@example.com";

                // Action: Create invitation with custom email
                const invitation = await createValidInvitation(
                    tx,
                    family.id,
                    manager.id,
                    { invitedEmail: customEmail },
                );

                // Assertions: Verify custom email is used
                expect(invitation.invited_email).toBe(customEmail);
            });
        });

        it("should accept custom expiration days", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create invitation with custom expiration
                const invitation = await createValidInvitation(
                    tx,
                    family.id,
                    manager.id,
                    { expiresInDays: 14 },
                );

                // Assertions: Verify expiration is approximately 14 days from now
                const now = new Date();
                const daysDiff =
                    (invitation.expires_at.getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24);
                expect(daysDiff).toBeGreaterThan(13.9);
                expect(daysDiff).toBeLessThan(14.1);
            });
        });

        it("should persist invitation to database", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create valid invitation
                const invitation = await createValidInvitation(
                    tx,
                    family.id,
                    manager.id,
                );

                // Assertions: Verify invitation exists in database
                const dbInvitation = await tx.query.familyInvitations.findFirst(
                    {
                        where: eq(familyInvitations.id, invitation.id),
                    },
                );
                expect(dbInvitation).toBeDefined();
                expect(dbInvitation?.token).toBe(invitation.token);
                expect(dbInvitation?.status).toBe("pending");
            });
        });

        it("should create multiple distinct invitations", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create multiple invitations
                const inv1 = await createValidInvitation(
                    tx,
                    family.id,
                    manager.id,
                );
                const inv2 = await createValidInvitation(
                    tx,
                    family.id,
                    manager.id,
                );

                // Assertions: Verify invitations are distinct
                expect(inv1.id).not.toBe(inv2.id);
                expect(inv1.token).not.toBe(inv2.token);
                expect(inv1.invited_email).not.toBe(inv2.invited_email);
            });
        });
    });

    describe("createExpiredInvitation", () => {
        it("should create an invitation with expired status", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create expired invitation
                const invitation = await createExpiredInvitation(
                    tx,
                    family.id,
                    manager.id,
                );

                // Assertions: Verify invitation properties
                expect(invitation).toBeDefined();
                expect(invitation.id).toBeDefined();
                expect(invitation.family_id).toBe(family.id);
                expect(invitation.invited_by_user_id).toBe(manager.id);
                expect(invitation.token).toBeDefined();
                expect(invitation.status).toBe("pending");
                expect(invitation.expires_at).toBeInstanceOf(Date);
            });
        });

        it("should create an invitation with expiration in the past", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create expired invitation
                const invitation = await createExpiredInvitation(
                    tx,
                    family.id,
                    manager.id,
                );

                // Assertions: Verify expiration is in the past
                const now = new Date();
                expect(invitation.expires_at.getTime()).toBeLessThan(
                    now.getTime(),
                );

                // Verify it's approximately 1 day ago (default)
                const daysDiff =
                    (now.getTime() - invitation.expires_at.getTime()) /
                    (1000 * 60 * 60 * 24);
                expect(daysDiff).toBeGreaterThan(0.9);
                expect(daysDiff).toBeLessThan(1.1);
            });
        });

        it("should accept custom invited email", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);
                const customEmail = "expired-custom@example.com";

                // Action: Create expired invitation with custom email
                const invitation = await createExpiredInvitation(
                    tx,
                    family.id,
                    manager.id,
                    { invitedEmail: customEmail },
                );

                // Assertions: Verify custom email is used
                expect(invitation.invited_email).toBe(customEmail);
            });
        });

        it("should accept custom expiration days", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create expired invitation with custom days
                const invitation = await createExpiredInvitation(
                    tx,
                    family.id,
                    manager.id,
                    { expiredDaysAgo: 5 },
                );

                // Assertions: Verify expiration is approximately 5 days ago
                const now = new Date();
                const daysDiff =
                    (now.getTime() - invitation.expires_at.getTime()) /
                    (1000 * 60 * 60 * 24);
                expect(daysDiff).toBeGreaterThan(4.9);
                expect(daysDiff).toBeLessThan(5.1);
            });
        });

        it("should persist expired invitation to database", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create expired invitation
                const invitation = await createExpiredInvitation(
                    tx,
                    family.id,
                    manager.id,
                );

                // Assertions: Verify invitation exists in database
                const dbInvitation = await tx.query.familyInvitations.findFirst(
                    {
                        where: eq(familyInvitations.id, invitation.id),
                    },
                );
                expect(dbInvitation).toBeDefined();
                expect(dbInvitation?.token).toBe(invitation.token);
                expect(dbInvitation?.status).toBe("pending");
                expect(dbInvitation?.expires_at.getTime()).toBeLessThan(
                    new Date().getTime(),
                );
            });
        });
    });

    describe("createUsedInvitation", () => {
        it("should create an invitation with accepted status by default", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create used invitation
                const invitation = await createUsedInvitation(
                    tx,
                    family.id,
                    manager.id,
                );

                // Assertions: Verify invitation properties
                expect(invitation).toBeDefined();
                expect(invitation.id).toBeDefined();
                expect(invitation.family_id).toBe(family.id);
                expect(invitation.invited_by_user_id).toBe(manager.id);
                expect(invitation.token).toBeDefined();
                expect(invitation.status).toBe("accepted");
                expect(invitation.expires_at).toBeInstanceOf(Date);
            });
        });

        it("should accept custom status", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create declined invitation
                const invitation = await createUsedInvitation(
                    tx,
                    family.id,
                    manager.id,
                    { status: "declined" },
                );

                // Assertions: Verify status is declined
                expect(invitation.status).toBe("declined");
            });
        });

        it("should support expired status", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create invitation with expired status
                const invitation = await createUsedInvitation(
                    tx,
                    family.id,
                    manager.id,
                    { status: "expired" },
                );

                // Assertions: Verify status is expired
                expect(invitation.status).toBe("expired");
            });
        });

        it("should support cancelled status", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create cancelled invitation
                const invitation = await createUsedInvitation(
                    tx,
                    family.id,
                    manager.id,
                    { status: "cancelled" },
                );

                // Assertions: Verify status is cancelled
                expect(invitation.status).toBe("cancelled");
            });
        });

        it("should accept custom invited email", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);
                const customEmail = "used-custom@example.com";

                // Action: Create used invitation with custom email
                const invitation = await createUsedInvitation(
                    tx,
                    family.id,
                    manager.id,
                    { invitedEmail: customEmail },
                );

                // Assertions: Verify custom email is used
                expect(invitation.invited_email).toBe(customEmail);
            });
        });

        it("should create invitation with future expiration by default", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create used invitation
                const invitation = await createUsedInvitation(
                    tx,
                    family.id,
                    manager.id,
                );

                // Assertions: Verify expiration is in the future
                const now = new Date();
                expect(invitation.expires_at.getTime()).toBeGreaterThan(
                    now.getTime(),
                );
            });
        });

        it("should accept custom expiration days", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create used invitation with custom expiration
                const invitation = await createUsedInvitation(
                    tx,
                    family.id,
                    manager.id,
                    { expiresInDays: 3 },
                );

                // Assertions: Verify expiration is approximately 3 days from now
                const now = new Date();
                const daysDiff =
                    (invitation.expires_at.getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24);
                expect(daysDiff).toBeGreaterThan(2.9);
                expect(daysDiff).toBeLessThan(3.1);
            });
        });

        it("should persist used invitation to database", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create used invitation
                const invitation = await createUsedInvitation(
                    tx,
                    family.id,
                    manager.id,
                    { status: "declined" },
                );

                // Assertions: Verify invitation exists in database
                const dbInvitation = await tx.query.familyInvitations.findFirst(
                    {
                        where: eq(familyInvitations.id, invitation.id),
                    },
                );
                expect(dbInvitation).toBeDefined();
                expect(dbInvitation?.token).toBe(invitation.token);
                expect(dbInvitation?.status).toBe("declined");
            });
        });
    });

    describe("Integration between invitation fixtures", () => {
        it("should allow creating all three types of invitations for the same family", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create user and family
                const manager = await createTestUser(tx);
                const family = await createTestFamily(tx, manager.id);

                // Action: Create all three types of invitations
                const validInv = await createValidInvitation(
                    tx,
                    family.id,
                    manager.id,
                );
                const expiredInv = await createExpiredInvitation(
                    tx,
                    family.id,
                    manager.id,
                );
                const usedInv = await createUsedInvitation(
                    tx,
                    family.id,
                    manager.id,
                );

                // Assertions: Verify all are distinct
                expect(validInv.id).not.toBe(expiredInv.id);
                expect(validInv.id).not.toBe(usedInv.id);
                expect(expiredInv.id).not.toBe(usedInv.id);

                // Verify their distinct properties
                expect(validInv.status).toBe("pending");
                expect(validInv.expires_at.getTime()).toBeGreaterThan(
                    new Date().getTime(),
                );

                expect(expiredInv.status).toBe("pending");
                expect(expiredInv.expires_at.getTime()).toBeLessThan(
                    new Date().getTime(),
                );

                expect(usedInv.status).toBe("accepted");
            });
        });

        it("should work with existing fixtures", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create complex family
                const user1 = await createTestUser(tx);
                const user2 = await createTestUser(tx);
                const family1 = await createTestFamily(tx, user1.id);
                const family2 = await createTestFamily(tx, user2.id);

                // Action: Create invitations for different families
                const inv1 = await createValidInvitation(
                    tx,
                    family1.id,
                    user1.id,
                );
                const inv2 = await createExpiredInvitation(
                    tx,
                    family2.id,
                    user2.id,
                );

                // Assertions: Verify invitations are for correct families
                expect(inv1.family_id).toBe(family1.id);
                expect(inv1.invited_by_user_id).toBe(user1.id);
                expect(inv2.family_id).toBe(family2.id);
                expect(inv2.invited_by_user_id).toBe(user2.id);
            });
        });
    });
});
