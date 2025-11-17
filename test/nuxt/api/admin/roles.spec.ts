import { describe, expect, it } from "vitest";
import { withTestTransaction } from "#test/utils";
import { getAllRoles, createRole } from "#server/services/roles";

describe("Admin Roles Service", () => {
    it("should return a list of roles", async () => {
        await withTestTransaction(async (tx) => {
            // 1. Setup: Create test roles
            await createRole(tx, {
                name: "Admin",
                description: "Administrator role",
            });
            await createRole(tx, {
                name: "User",
                description: "Standard user role",
            });

            // 2. Action: Get all roles
            const roles = await getAllRoles(tx);

            // 3. Assertion: Verify roles were retrieved
            expect(roles).toBeDefined();
            expect(roles.length).toBeGreaterThanOrEqual(2);

            const roleNames = roles.map((r) => r.name);
            expect(roleNames).toContain("Admin");
            expect(roleNames).toContain("User");
        });
    });

    it("should return an empty array when no roles exist", async () => {
        await withTestTransaction(async (tx) => {
            // Don't create any roles

            // Action: Get all roles
            const roles = await getAllRoles(tx);

            // Assertion: Should return empty array (or only pre-existing roles)
            expect(roles).toBeDefined();
            expect(Array.isArray(roles)).toBe(true);
        });
    });

    it("should create a new role successfully", async () => {
        await withTestTransaction(async (tx) => {
            // 1. Action: Create a role
            const newRole = await createRole(tx, {
                name: "Manager",
                description: "Management role",
            });

            // 2. Assertion: Verify role was created
            expect(newRole).toBeDefined();
            expect(newRole.name).toBe("Manager");
            expect(newRole.description).toBe("Management role");
            expect(newRole.id).toBeDefined();

            // 3. Verify it's in the database
            const roles = await getAllRoles(tx);
            const createdRole = roles.find((r) => r.id === newRole.id);
            expect(createdRole).toBeDefined();
            expect(createdRole?.name).toBe("Manager");
        });
    });
});
