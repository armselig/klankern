import { describe, it, expect } from "vitest";
import { withTestTransaction } from "#test/utils/db";
import { createTestUser, createTestAdminUser } from "#test/utils/fixtures";
import { getAllRoles, createRole } from "#server/services/roles";
import { UnauthorizedError, ForbiddenError } from "#server/lib/errors";

describe("roles service", () => {
    describe("getAllRoles", () => {
        it("should throw UnauthorizedError if user is not authenticated", async () => {
            await withTestTransaction(async (tx) => {
                await expect(getAllRoles(tx, null)).rejects.toThrow(
                    UnauthorizedError,
                );
            });
        });

        it("should throw ForbiddenError if user is not an admin", async () => {
            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx);
                await expect(getAllRoles(tx, user.id)).rejects.toThrow(
                    ForbiddenError,
                );
            });
        });

        it("should return all roles if user is an admin", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                await createRole(tx, admin.id, { name: "test-role" });
                const roles = await getAllRoles(tx, admin.id);
                expect(roles.length).toBeGreaterThanOrEqual(1);
            });
        });
    });

    describe("createRole", () => {
        it("should throw UnauthorizedError if user is not authenticated", async () => {
            await withTestTransaction(async (tx) => {
                await expect(
                    createRole(tx, null, { name: "test-role" }),
                ).rejects.toThrow(UnauthorizedError);
            });
        });

        it("should throw ForbiddenError if user is not an admin", async () => {
            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx);
                await expect(
                    createRole(tx, user.id, { name: "test-role" }),
                ).rejects.toThrow(ForbiddenError);
            });
        });

        it("should create a role if user is an admin", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                const newRole = await createRole(tx, admin.id, {
                    name: "test-role",
                });
                expect(newRole).toBeDefined();
                expect(newRole.name).toBe("test-role");
            });
        });
    });
});
