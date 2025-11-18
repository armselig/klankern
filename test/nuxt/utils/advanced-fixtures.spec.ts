import { describe, expect, it } from "vitest";
import { eq, and } from "drizzle-orm";
import { withTestTransaction } from "#test/utils";
import {
    createTestAdminUser,
    createTestUserWithRole,
    createTestUser,
    createFamilyWithMembers,
    createComplexFamily,
} from "#test/utils/fixtures";
import { users, roles, userRoles, familyMembers } from "#server/db/schema";

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

    describe("createFamilyWithMembers", () => {
        it("should create a family with the creator as manager", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create creator
                const creator = await createTestUser(tx);

                // Action: Create family with members
                const result = await createFamilyWithMembers(tx, creator);

                // Assertions: Verify family was created
                expect(result.family).toBeDefined();
                expect(result.family.id).toBeDefined();
                expect(result.family.creator_id).toBe(creator.id);

                // Verify creator is a member with manager role
                const creatorMembership =
                    await tx.query.familyMembers.findFirst({
                        where: and(
                            eq(familyMembers.family_id, result.family.id),
                            eq(familyMembers.user_id, creator.id),
                        ),
                    });
                expect(creatorMembership).toBeDefined();
                expect(creatorMembership?.role).toBe("manager");
            });
        });

        it("should create family with specified number of members", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create creator
                const creator = await createTestUser(tx);

                // Action: Create family with 3 regular members
                const result = await createFamilyWithMembers(tx, creator, {
                    members: 3,
                });

                // Assertions: Verify 3 regular members were created
                expect(result.regularMembers).toHaveLength(3);
                expect(result.members).toHaveLength(3);

                // Verify all members have member role
                for (const { user, role } of result.regularMembers) {
                    expect(role).toBe("member");
                    const membership = await tx.query.familyMembers.findFirst({
                        where: and(
                            eq(familyMembers.family_id, result.family.id),
                            eq(familyMembers.user_id, user.id),
                        ),
                    });
                    expect(membership?.role).toBe("member");
                }
            });
        });

        it("should create family with specified number of managers", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create creator
                const creator = await createTestUser(tx);

                // Action: Create family with 2 managers
                const result = await createFamilyWithMembers(tx, creator, {
                    managers: 2,
                });

                // Assertions: Verify 2 managers were created
                expect(result.managers).toHaveLength(2);
                expect(result.members).toHaveLength(2);

                // Verify all have manager role
                for (const { user, role } of result.managers) {
                    expect(role).toBe("manager");
                    const membership = await tx.query.familyMembers.findFirst({
                        where: and(
                            eq(familyMembers.family_id, result.family.id),
                            eq(familyMembers.user_id, user.id),
                        ),
                    });
                    expect(membership?.role).toBe("manager");
                }
            });
        });

        it("should create family with both members and managers", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create creator
                const creator = await createTestUser(tx);

                // Action: Create family with 2 managers and 3 members
                const result = await createFamilyWithMembers(tx, creator, {
                    members: 3,
                    managers: 2,
                });

                // Assertions: Verify correct counts
                expect(result.managers).toHaveLength(2);
                expect(result.regularMembers).toHaveLength(3);
                expect(result.members).toHaveLength(5); // Total of both

                // Verify roles are correct
                expect(result.managers.every((m) => m.role === "manager")).toBe(
                    true,
                );
                expect(
                    result.regularMembers.every((m) => m.role === "member"),
                ).toBe(true);
            });
        });

        it("should accept custom family name", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create creator
                const creator = await createTestUser(tx);
                const customName = "My Custom Family Name";

                // Action: Create family with custom name
                const result = await createFamilyWithMembers(tx, creator, {
                    name: customName,
                });

                // Assertions: Verify family has custom name
                expect(result.family.name).toBe(customName);
            });
        });

        it("should return empty arrays when no members specified", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create creator
                const creator = await createTestUser(tx);

                // Action: Create family with no additional members
                const result = await createFamilyWithMembers(tx, creator);

                // Assertions: Verify empty arrays
                expect(result.members).toHaveLength(0);
                expect(result.managers).toHaveLength(0);
                expect(result.regularMembers).toHaveLength(0);

                // Verify only creator is a member
                const allMembers = await tx.query.familyMembers.findMany({
                    where: eq(familyMembers.family_id, result.family.id),
                });
                expect(allMembers).toHaveLength(1);
                expect(allMembers[0].user_id).toBe(creator.id);
            });
        });

        it("should create distinct users for each member", async () => {
            await withTestTransaction(async (tx) => {
                // Setup: Create creator
                const creator = await createTestUser(tx);

                // Action: Create family with multiple members
                const result = await createFamilyWithMembers(tx, creator, {
                    members: 3,
                    managers: 2,
                });

                // Assertions: All users should be distinct
                const userIds = result.members.map((m) => m.user.id);
                const uniqueUserIds = new Set(userIds);
                expect(uniqueUserIds.size).toBe(5);

                // None should be the creator
                expect(userIds).not.toContain(creator.id);
            });
        });
    });

    describe("createComplexFamily", () => {
        it("should create family with creator and default member counts", async () => {
            await withTestTransaction(async (tx) => {
                // Action: Create complex family with defaults
                const result = await createComplexFamily(tx);

                // Assertions: Verify creator was created
                expect(result.creator).toBeDefined();
                expect(result.creator.id).toBeDefined();

                // Verify family was created with creator
                expect(result.family).toBeDefined();
                expect(result.family.creator_id).toBe(result.creator.id);

                // Verify default counts (1 manager, 2 members)
                expect(result.managers).toHaveLength(1);
                expect(result.regularMembers).toHaveLength(2);
            });
        });

        it("should create family with custom member counts", async () => {
            await withTestTransaction(async (tx) => {
                // Action: Create complex family with custom counts
                const result = await createComplexFamily(tx, {
                    withManagers: 3,
                    withMembers: 5,
                });

                // Assertions: Verify custom counts
                expect(result.managers).toHaveLength(3);
                expect(result.regularMembers).toHaveLength(5);
                expect(result.members).toHaveLength(8);
            });
        });

        it("should accept custom family name", async () => {
            await withTestTransaction(async (tx) => {
                const customName = "Complex Test Family";

                // Action: Create complex family with custom name
                const result = await createComplexFamily(tx, {
                    name: customName,
                });

                // Assertions: Verify family has custom name
                expect(result.family.name).toBe(customName);
            });
        });

        it("should create creator as family manager", async () => {
            await withTestTransaction(async (tx) => {
                // Action: Create complex family
                const result = await createComplexFamily(tx);

                // Assertions: Verify creator is a member with manager role
                const creatorMembership =
                    await tx.query.familyMembers.findFirst({
                        where: and(
                            eq(familyMembers.family_id, result.family.id),
                            eq(familyMembers.user_id, result.creator.id),
                        ),
                    });
                expect(creatorMembership).toBeDefined();
                expect(creatorMembership?.role).toBe("manager");
            });
        });

        it("should create family with zero additional members", async () => {
            await withTestTransaction(async (tx) => {
                // Action: Create complex family with zero additional members
                const result = await createComplexFamily(tx, {
                    withManagers: 0,
                    withMembers: 0,
                });

                // Assertions: Verify only creator is a member
                expect(result.managers).toHaveLength(0);
                expect(result.regularMembers).toHaveLength(0);
                expect(result.members).toHaveLength(0);

                const allMembers = await tx.query.familyMembers.findMany({
                    where: eq(familyMembers.family_id, result.family.id),
                });
                expect(allMembers).toHaveLength(1);
                expect(allMembers[0].user_id).toBe(result.creator.id);
            });
        });

        it("should create multiple distinct complex families", async () => {
            await withTestTransaction(async (tx) => {
                // Action: Create multiple complex families
                const family1 = await createComplexFamily(tx, {
                    name: "Family 1",
                });
                const family2 = await createComplexFamily(tx, {
                    name: "Family 2",
                });

                // Assertions: All should be distinct
                expect(family1.family.id).not.toBe(family2.family.id);
                expect(family1.creator.id).not.toBe(family2.creator.id);
                expect(family1.family.name).toBe("Family 1");
                expect(family2.family.name).toBe("Family 2");

                // Each family should have its own members
                const family1Members = await tx.query.familyMembers.findMany({
                    where: eq(familyMembers.family_id, family1.family.id),
                });
                const family2Members = await tx.query.familyMembers.findMany({
                    where: eq(familyMembers.family_id, family2.family.id),
                });

                // Default is 1 manager + 2 members + creator = 4 total
                expect(family1Members).toHaveLength(4);
                expect(family2Members).toHaveLength(4);
            });
        });

        it("should properly categorize members by role", async () => {
            await withTestTransaction(async (tx) => {
                // Action: Create complex family
                const result = await createComplexFamily(tx, {
                    withManagers: 2,
                    withMembers: 3,
                });

                // Assertions: Verify all managers have manager role
                for (const { user, role } of result.managers) {
                    expect(role).toBe("manager");
                    const membership = await tx.query.familyMembers.findFirst({
                        where: and(
                            eq(familyMembers.family_id, result.family.id),
                            eq(familyMembers.user_id, user.id),
                        ),
                    });
                    expect(membership?.role).toBe("manager");
                }

                // Verify all regular members have member role
                for (const { user, role } of result.regularMembers) {
                    expect(role).toBe("member");
                    const membership = await tx.query.familyMembers.findFirst({
                        where: and(
                            eq(familyMembers.family_id, result.family.id),
                            eq(familyMembers.user_id, user.id),
                        ),
                    });
                    expect(membership?.role).toBe("member");
                }
            });
        });
    });
});
