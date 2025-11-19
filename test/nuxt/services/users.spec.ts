import { describe, it, expect } from "vitest";
import { withTestTransaction } from "#test/utils/db";
import { createTestUser, createTestAdminUser } from "#test/utils/fixtures";
import { getAllUsersWithRoles, createUser } from "#server/services/users";
import { UnauthorizedError, ForbiddenError } from "#server/lib/errors";

describe("users service", () => {
    describe("getAllUsersWithRoles", () => {
        it("should throw UnauthorizedError if user is not authenticated", async () => {
            await withTestTransaction(async (tx) => {
                await expect(getAllUsersWithRoles(tx, null)).rejects.toThrow(
                    UnauthorizedError,
                );
            });
        });

        it("should throw ForbiddenError if user is not an admin", async () => {
            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx);
                await expect(getAllUsersWithRoles(tx, user.id)).rejects.toThrow(
                    ForbiddenError,
                );
            });
        });

        it("should return all users if user is an admin", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                await createTestUser(tx); // create another user
                const users = await getAllUsersWithRoles(tx, admin.id);
                expect(users.length).toBeGreaterThanOrEqual(2);
            });
        });
    });

    describe("createUser", () => {
        it("should throw UnauthorizedError if user is not authenticated", async () => {
            await withTestTransaction(async (tx) => {
                await expect(
                    createUser(tx, null, {
                        email: "test@example.com",
                        username: "testuser",
                        password: "password",
                    }),
                ).rejects.toThrow(UnauthorizedError);
            });
        });

        it("should throw ForbiddenError if user is not an admin", async () => {
            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx);
                await expect(
                    createUser(tx, user.id, {
                        email: "test@example.com",
                        username: "testuser",
                        password: "password",
                    }),
                ).rejects.toThrow(ForbiddenError);
            });
        });

        it("should create a user if user is an admin", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                const newUser = await createUser(tx, admin.id, {
                    email: "test@example.com",
                    username: "testuser",
                    password: "password",
                });
                expect(newUser).toBeDefined();
                expect(newUser.email).toBe("test@example.com");
            });
        });
    });
});
