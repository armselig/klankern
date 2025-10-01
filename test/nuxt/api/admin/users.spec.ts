import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "#server/db";
import handler from "../../../../server/api/admin/users/index.get";

describe("Admin Users API - GET /api/admin/users", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should fetch all users with their roles", async () => {
        // Arrange
        const mockUsers = [{ id: "1", username: "admin", userRoles: [] }];
        const event = {} as any; // Mock event object
        vi.mocked(db.query.users.findMany).mockResolvedValue(mockUsers);

        // Act
        const users = await handler(event);

        // Assert
        expect(users).toEqual(mockUsers);
        expect(db.query.users.findMany).toHaveBeenCalledOnce();
    });
});
