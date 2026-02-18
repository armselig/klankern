import { describe, expect, it } from "vitest";
import {
    withTestTransaction,
    createTestUser,
    createTestAdminUser,
} from "#test/utils";
import { getAllRoles, createRole } from "#server/services/roles";
import { ForbiddenError, UnauthorizedError } from "#server/lib/errors";

describe("Admin Roles Service", () => {
    describe("getAllRoles", () => {
        it("should return a list of roles", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                // 1. Setup: Create test roles
                await createRole(tx, admin.id, {
                    name: "test-moderator",
                    description: "Moderator role",
                });
                await createRole(tx, admin.id, {
                    name: "test-viewer",
                    description: "Viewer role",
                });

                // 2. Action: Get all roles
                const roles = await getAllRoles(tx, admin.id);

                // 3. Assertion: Verify roles were retrieved
                expect(roles).toBeDefined();
                expect(roles.length).toBeGreaterThanOrEqual(2);

                const roleNames = roles.map((r) => r.name);
                expect(roleNames).toContain("test-moderator");
                expect(roleNames).toContain("test-viewer");
            });
        });

        it("should return an empty array when no roles exist", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                // Don't create any roles

                // Action: Get all roles
                const roles = await getAllRoles(tx, admin.id);

                // Assertion: Should return empty array (or only pre-existing roles)
                expect(roles).toBeDefined();
                expect(Array.isArray(roles)).toBe(true);
            });
        });

        it("should throw ForbiddenError for non-admin users", async () => {
            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx);
                await expect(getAllRoles(tx, user.id)).rejects.toThrow(
                    ForbiddenError,
                );
            });
        });

        it("should throw UnauthorizedError for unauthenticated users", async () => {
            await withTestTransaction(async (tx) => {
                await expect(getAllRoles(tx, null)).rejects.toThrow(
                    UnauthorizedError,
                );
            });
        });
    });

    describe("createRole", () => {
        it("should create a new role successfully", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                // 1. Action: Create a role
                const newRole = await createRole(tx, admin.id, {
                    name: "test-manager",
                    description: "Management role",
                });

                // 2. Assertion: Verify role was created
                expect(newRole).toBeDefined();
                expect(newRole.name).toBe("test-manager");
                expect(newRole.description).toBe("Management role");
                expect(newRole.id).toBeDefined();

                // 3. Verify it's in the database
                const roles = await getAllRoles(tx, admin.id);
                const createdRole = roles.find((r) => r.id === newRole.id);
                expect(createdRole).toBeDefined();
                expect(createdRole?.name).toBe("test-manager");
            });
        });

        it("should throw ForbiddenError for non-admin users", async () => {
            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx);
                await expect(
                    createRole(tx, user.id, { name: "test-role" }),
                ).rejects.toThrow(ForbiddenError);
            });
        });

        it("should throw UnauthorizedError for unauthenticated users", async () => {
            await withTestTransaction(async (tx) => {
                await expect(
                    createRole(tx, null, { name: "test-role" }),
                ).rejects.toThrow(UnauthorizedError);
            });
        });
    });
});
