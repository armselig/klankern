import { vi } from "vitest";

/**
 * @file Tests for the admin user API endpoints.
 * @description These tests verify the functionality of the user management API.
 * The database is mocked to ensure tests are fast and predictable.
 * We use vi.doMock to ensure the mock is applied before any other modules are imported.
 */

const mockDb = {
    query: {
        users: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
        },
        roles: {
            findFirst: vi.fn(),
        },
    },
    insert: vi.fn(() => mockDb),
    values: vi.fn(() => mockDb),
    returning: vi.fn(),
    update: vi.fn(() => mockDb),
    set: vi.fn(() => mockDb),
    where: vi.fn(() => mockDb),
    delete: vi.fn(() => mockDb),
    transaction: vi.fn(),
};

vi.doMock("#server/db", () => ({ db: mockDb }));
vi.doMock("bcryptjs", () => ({
    default: {
        hash: vi.fn().mockResolvedValue("hashed_password"),
    },
}));

const { describe, it, expect, beforeEach } = await import("vitest");
const { setup, $fetch } = await import("@nuxt/test-utils");
const { db } = await import("#server/db");

describe("Admin Users API", async () => {
    await setup({ server: true });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("GET /api/admin/users", () => {
        it("should fetch all users with their roles", async () => {
            // Arrange
            const mockUsers = [{ id: "1", username: "admin" }];
            vi.mocked(db.query.users.findMany).mockResolvedValue(
                mockUsers as any,
            );

            // Act
            const users = await $fetch("/api/admin/users");

            // Assert
            expect(users).toEqual(mockUsers);
            expect(db.query.users.findMany).toHaveBeenCalledOnce();
        });
    });
});
