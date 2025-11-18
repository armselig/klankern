import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { withTestTransaction } from "#test/utils";
import {
    createTestAdminUser,
    createTestUserWithRole,
} from "#test/utils/fixtures";
import { users, roles, userRoles } from "#server/db/schema";

describe("Advanced Test Fixtures", () => {
    describe("createTestAdminUser", () => {
        it("should create a user with admin role", async () => {
            await withTestTransaction(async (tx) => {
                // Action: Create admin user
                const adminUser = await createTestAdminUser(tx);

                // Assertions: Verify user was created
                expect(adminUser).toBeDefined();
                expect(adminUser.id).toBeDefined();
                expect(adminUser.email).toContain("admin");
                expect(adminUser.username).toContain("admin");

                // Verify user exists in database
                const dbUser = await tx.query.users.findFirst({
                    where: eq(users.id, adminUser.id),
                });
                expect(dbUser).toBeDefined();
                expect(dbUser?.id).toBe(adminUser.id);
            });
        });

        it("should assign admin role to the user", async () => {
            await withTestTransaction(async (tx) => {
                // Action: Create admin user
                const adminUser = await createTestAdminUser(tx);

                // Verify admin role exists
                const adminRole = await tx.query.roles.findFirst({
                    where: eq(roles.name, "admin"),
                });
                expect(adminRole).toBeDefined();
                expect(adminRole?.name).toBe("admin");
                expect(adminRole?.description).toBe("Administrator role");

                // Verify user has admin role assigned
                const userRoleAssignment = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, adminUser.id),
                });
                expect(userRoleAssignment).toBeDefined();
                expect(userRoleAssignment?.role_id).toBe(adminRole?.id);
            });
        });

        it("should reuse existing admin role if it exists", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create first admin user (creates admin role)
                const admin1 = await createTestAdminUser(tx);

                // Get initial role count
                const rolesAfterFirst = await tx.query.roles.findMany({
                    where: eq(roles.name, "admin"),
                });
                expect(rolesAfterFirst).toHaveLength(1);

                // Action: Create second admin user (should reuse role)
                const admin2 = await createTestAdminUser(tx);

                // Assertions: Verify both users have same role
                const rolesAfterSecond = await tx.query.roles.findMany({
                    where: eq(roles.name, "admin"),
                });
                expect(rolesAfterSecond).toHaveLength(1); // Still only one admin role

                const admin1Role = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, admin1.id),
                });
                const admin2Role = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, admin2.id),
                });

                expect(admin1Role?.role_id).toBe(admin2Role?.role_id);
            });
        });

        it("should accept custom email option", async () => {
            await withTestTransaction(async (tx) => {
                const customEmail = "custom-admin@example.com";

                // Action: Create admin with custom email
                const adminUser = await createTestAdminUser(tx, {
                    email: customEmail,
                });

                // Assertions
                expect(adminUser.email).toBe(customEmail);
            });
        });

        it("should accept custom username option", async () => {
            await withTestTransaction(async (tx) => {
                const customUsername = "customadmin";

                // Action: Create admin with custom username
                const adminUser = await createTestAdminUser(tx, {
                    username: customUsername,
                });

                // Assertions
                expect(adminUser.username).toBe(customUsername);
            });
        });

        it("should accept custom password option", async () => {
            await withTestTransaction(async (tx) => {
                const customPassword = "custompassword456";

                // Action: Create admin with custom password
                const adminUser = await createTestAdminUser(tx, {
                    password: customPassword,
                });

                // Assertions
                expect(adminUser.password).toBe(customPassword);
            });
        });

        it("should create multiple distinct admin users", async () => {
            await withTestTransaction(async (tx) => {
                // Action: Create multiple admin users
                const admin1 = await createTestAdminUser(tx);
                const admin2 = await createTestAdminUser(tx);
                const admin3 = await createTestAdminUser(tx);

                // Assertions: All users should be distinct
                expect(admin1.id).not.toBe(admin2.id);
                expect(admin1.id).not.toBe(admin3.id);
                expect(admin2.id).not.toBe(admin3.id);

                expect(admin1.email).not.toBe(admin2.email);
                expect(admin1.email).not.toBe(admin3.email);
                expect(admin2.email).not.toBe(admin3.email);

                expect(admin1.username).not.toBe(admin2.username);
                expect(admin1.username).not.toBe(admin3.username);
                expect(admin2.username).not.toBe(admin3.username);

                // All should have admin role
                const admin1Role = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, admin1.id),
                });
                const admin2Role = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, admin2.id),
                });
                const admin3Role = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, admin3.id),
                });

                expect(admin1Role).toBeDefined();
                expect(admin2Role).toBeDefined();
                expect(admin3Role).toBeDefined();

                // All should share the same role_id
                expect(admin1Role?.role_id).toBe(admin2Role?.role_id);
                expect(admin2Role?.role_id).toBe(admin3Role?.role_id);
            });
        });
    });

    describe("createTestUserWithRole", () => {
        it("should create a user with specified role", async () => {
            await withTestTransaction(async (tx) => {
                const roleName = "manager";

                // Action: Create user with manager role
                const user = await createTestUserWithRole(tx, roleName);

                // Assertions: Verify user was created
                expect(user).toBeDefined();
                expect(user.id).toBeDefined();
                expect(user.email).toContain(roleName);
                expect(user.username).toContain(roleName);

                // Verify user exists in database
                const dbUser = await tx.query.users.findFirst({
                    where: eq(users.id, user.id),
                });
                expect(dbUser).toBeDefined();
            });
        });

        it("should create and assign the specified role", async () => {
            await withTestTransaction(async (tx) => {
                const roleName = "editor";

                // Action: Create user with editor role
                const user = await createTestUserWithRole(tx, roleName);

                // Verify role exists
                const role = await tx.query.roles.findFirst({
                    where: eq(roles.name, roleName),
                });
                expect(role).toBeDefined();
                expect(role?.name).toBe(roleName);
                expect(role?.description).toBe(`${roleName} role`);

                // Verify user has role assigned
                const userRoleAssignment = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, user.id),
                });
                expect(userRoleAssignment).toBeDefined();
                expect(userRoleAssignment?.role_id).toBe(role?.id);
            });
        });

        it("should reuse existing role if it exists", async () => {
            await withTestTransaction(async (tx) => {
                const roleName = "moderator";

                // Setup: Create first user (creates role)
                const user1 = await createTestUserWithRole(tx, roleName);

                // Get initial role count
                const rolesAfterFirst = await tx.query.roles.findMany({
                    where: eq(roles.name, roleName),
                });
                expect(rolesAfterFirst).toHaveLength(1);

                // Action: Create second user (should reuse role)
                const user2 = await createTestUserWithRole(tx, roleName);

                // Assertions: Verify both users have same role
                const rolesAfterSecond = await tx.query.roles.findMany({
                    where: eq(roles.name, roleName),
                });
                expect(rolesAfterSecond).toHaveLength(1); // Still only one role

                const user1Role = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, user1.id),
                });
                const user2Role = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, user2.id),
                });

                expect(user1Role?.role_id).toBe(user2Role?.role_id);
            });
        });

        it("should create different roles for different role names", async () => {
            await withTestTransaction(async (tx) => {
                // Action: Create users with different roles
                const viewer = await createTestUserWithRole(tx, "viewer");
                const contributor = await createTestUserWithRole(
                    tx,
                    "contributor",
                );
                const reviewer = await createTestUserWithRole(tx, "reviewer");

                // Get role assignments
                const viewerRole = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, viewer.id),
                });
                const contributorRole = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, contributor.id),
                });
                const reviewerRole = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, reviewer.id),
                });

                // Assertions: All should have different role IDs
                expect(viewerRole?.role_id).not.toBe(contributorRole?.role_id);
                expect(viewerRole?.role_id).not.toBe(reviewerRole?.role_id);
                expect(contributorRole?.role_id).not.toBe(
                    reviewerRole?.role_id,
                );

                // Verify role names
                const viewerRoleData = await tx.query.roles.findFirst({
                    where: eq(roles.id, viewerRole!.role_id),
                });
                const contributorRoleData = await tx.query.roles.findFirst({
                    where: eq(roles.id, contributorRole!.role_id),
                });
                const reviewerRoleData = await tx.query.roles.findFirst({
                    where: eq(roles.id, reviewerRole!.role_id),
                });

                expect(viewerRoleData?.name).toBe("viewer");
                expect(contributorRoleData?.name).toBe("contributor");
                expect(reviewerRoleData?.name).toBe("reviewer");
            });
        });

        it("should accept custom email option", async () => {
            await withTestTransaction(async (tx) => {
                const customEmail = "custom-user@example.com";

                // Action: Create user with custom email
                const user = await createTestUserWithRole(tx, "analyst", {
                    email: customEmail,
                });

                // Assertions
                expect(user.email).toBe(customEmail);
            });
        });

        it("should accept custom username option", async () => {
            await withTestTransaction(async (tx) => {
                const customUsername = "customuser123";

                // Action: Create user with custom username
                const user = await createTestUserWithRole(tx, "analyst", {
                    username: customUsername,
                });

                // Assertions
                expect(user.username).toBe(customUsername);
            });
        });

        it("should accept custom password option", async () => {
            await withTestTransaction(async (tx) => {
                const customPassword = "custompassword789";

                // Action: Create user with custom password
                const user = await createTestUserWithRole(tx, "analyst", {
                    password: customPassword,
                });

                // Assertions
                expect(user.password).toBe(customPassword);
            });
        });

        it("should create multiple users with the same role", async () => {
            await withTestTransaction(async (tx) => {
                const roleName = "developer";

                // Action: Create multiple users with same role
                const dev1 = await createTestUserWithRole(tx, roleName);
                const dev2 = await createTestUserWithRole(tx, roleName);
                const dev3 = await createTestUserWithRole(tx, roleName);

                // Assertions: All users should be distinct
                expect(dev1.id).not.toBe(dev2.id);
                expect(dev1.id).not.toBe(dev3.id);
                expect(dev2.id).not.toBe(dev3.id);

                // All should have the same role
                const dev1Role = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, dev1.id),
                });
                const dev2Role = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, dev2.id),
                });
                const dev3Role = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, dev3.id),
                });

                expect(dev1Role?.role_id).toBe(dev2Role?.role_id);
                expect(dev2Role?.role_id).toBe(dev3Role?.role_id);

                // Verify role name
                const roleData = await tx.query.roles.findFirst({
                    where: eq(roles.id, dev1Role!.role_id),
                });
                expect(roleData?.name).toBe(roleName);
            });
        });

        it("should handle role names with special characters", async () => {
            await withTestTransaction(async (tx) => {
                const roleName = "content-moderator";

                // Action: Create user with hyphenated role name
                const user = await createTestUserWithRole(tx, roleName);

                // Assertions
                expect(user).toBeDefined();
                expect(user.email).toContain(roleName);

                // Verify role was created correctly
                const role = await tx.query.roles.findFirst({
                    where: eq(roles.name, roleName),
                });
                expect(role?.name).toBe(roleName);
            });
        });
    });

    describe("Integration between fixtures", () => {
        it("should allow creating both admin users and role-specific users", async () => {
            await withTestTransaction(async (tx) => {
                // Action: Create various users
                const admin = await createTestAdminUser(tx);
                const manager = await createTestUserWithRole(tx, "manager");
                const editor = await createTestUserWithRole(tx, "editor");

                // Assertions: All users should be distinct
                expect(admin.id).not.toBe(manager.id);
                expect(admin.id).not.toBe(editor.id);
                expect(manager.id).not.toBe(editor.id);

                // Verify all have roles assigned
                const adminRoleAssignment = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, admin.id),
                });
                const managerRoleAssignment =
                    await tx.query.userRoles.findFirst({
                        where: eq(userRoles.user_id, manager.id),
                    });
                const editorRoleAssignment = await tx.query.userRoles.findFirst(
                    {
                        where: eq(userRoles.user_id, editor.id),
                    },
                );

                expect(adminRoleAssignment).toBeDefined();
                expect(managerRoleAssignment).toBeDefined();
                expect(editorRoleAssignment).toBeDefined();

                // All should have different role IDs
                expect(adminRoleAssignment?.role_id).not.toBe(
                    managerRoleAssignment?.role_id,
                );
                expect(adminRoleAssignment?.role_id).not.toBe(
                    editorRoleAssignment?.role_id,
                );
                expect(managerRoleAssignment?.role_id).not.toBe(
                    editorRoleAssignment?.role_id,
                );
            });
        });

        it("should not interfere with existing createTestUser fixture", async () => {
            await withTestTransaction(async (tx) => {
                // Import the basic fixture
                const { createTestUser } = await import("#test/utils/fixtures");

                // Action: Create a basic user without roles
                const basicUser = await createTestUser(tx);
                const adminUser = await createTestAdminUser(tx);

                // Assertions: Basic user should not have any roles
                const basicUserRoles = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, basicUser.id),
                });
                expect(basicUserRoles).toBeUndefined();

                // Admin user should have admin role
                const adminUserRoles = await tx.query.userRoles.findFirst({
                    where: eq(userRoles.user_id, adminUser.id),
                });
                expect(adminUserRoles).toBeDefined();
            });
        });
    });
});
