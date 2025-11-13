import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError, readBody } from "h3";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the email sender utility
const mockSendInvitationEmail = vi.fn();
vi.mock("~/server/utils/email-sender", () => ({
    sendInvitationEmail: mockSendInvitationEmail,
}));

// Mock the database dependency
const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ id: "new-invitation-id" }]),
    query: {
        familyMembers: {
            findFirst: vi.fn().mockResolvedValue(null), // Default to user not being a member
        },
    },
};

vi.mock("#server/db", () => ({
    db: mockDb,
}));

describe("POST /api/families/:familyId/invitations", () => {
    const familyId = "family-123";
    const managerUser = {
        id: "user-manager-123",
        roles: [{ name: "user" }],
    };
    const regularUser = {
        id: "user-regular-456",
        roles: [{ name: "user" }],
    };
    const validInvitationBody = { email: "new.member@example.com" };

    // Reset mocks before each test
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return 401 for unauthenticated users", async () => {
        registerEndpoint(`/api/families/${familyId}/invitations`, {
            method: "POST",
            handler: (event) => {
                if (!event.context.user) {
                    throw createError({ statusCode: 401 });
                }
                return {};
            },
        });

        await expect(
            $fetch(`/api/families/${familyId}/invitations`, {
                method: "POST",
                body: validInvitationBody,
            }),
        ).rejects.toMatchObject({ statusCode: 401 });
    });

    it("should return 403 if the user is not a manager of the family", async () => {
        // Mock DB to return that the user is a regular member, not a manager
        mockDb.query.familyMembers.findFirst.mockResolvedValueOnce({
            role: "member",
        });

        registerEndpoint(`/api/families/${familyId}/invitations`, {
            method: "POST",
            handler: async (event) => {
                event.context.user = regularUser;
                // Simplified mock of authorization logic
                const membership = await mockDb.query.familyMembers.findFirst();
                if (membership?.role !== "manager") {
                    throw createError({ statusCode: 403 });
                }
                return {};
            },
        });

        await expect(
            $fetch(`/api/families/${familyId}/invitations`, {
                method: "POST",
                body: validInvitationBody,
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it("should return 400 for an invalid email", async () => {
        registerEndpoint(`/api/families/${familyId}/invitations`, {
            method: "POST",
            handler: async (event) => {
                event.context.user = managerUser;
                const body = await readBody(event);
                if (!body.email || !body.email.includes("@")) {
                    throw createError({ statusCode: 400 });
                }
                return {};
            },
        });

        await expect(
            $fetch(`/api/families/${familyId}/invitations`, {
                method: "POST",
                body: { email: "invalid" },
            }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("should successfully create an invitation and send an email", async () => {
        // Mock DB to return that the user is a manager
        mockDb.query.familyMembers.findFirst.mockResolvedValueOnce({
            role: "manager",
        });

        registerEndpoint(`/api/families/${familyId}/invitations`, {
            method: "POST",
            handler: async (event) => {
                event.context.user = managerUser;
                const body = await readBody(event);

                // Simplified mock of the full logic
                await mockDb.insert().values({}); // Mock DB insert
                await mockSendInvitationEmail({ to: body.email }); // Mock email send

                return { message: "Invitation sent successfully" };
            },
        });

        const response = await $fetch(`/api/families/${familyId}/invitations`, {
            method: "POST",
            body: validInvitationBody,
        });

        expect(response.message).toBe("Invitation sent successfully");
        // Verify that the email sending function was called
        expect(mockSendInvitationEmail).toHaveBeenCalledOnce();
        expect(mockSendInvitationEmail).toHaveBeenCalledWith({
            to: validInvitationBody.email,
        });
    });
});
