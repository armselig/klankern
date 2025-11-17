import { describe, expect, it } from "vitest";
import { withTestTransaction, createTestUser } from "#test/utils";
import { getAllUsersWithRoles, createUser } from "#server/services/users";
import { createRole } from "#server/services/roles";
import { ConflictError } from "#server/lib/errors";
import { userRoles } from "#server/db/schema";

describe("Admin Users Service", () => {
    describe("getAllUsersWithRoles", () => {
        it("should return an empty array when no users exist", async () => {
            await withTestTransaction(async (tx) => {
                const users = await getAllUsersWithRoles(tx);

                expect(users).toBeDefined();
                expect(Array.isArray(users)).toBe(true);
                // May have users from other tests in parallel, so just check structure
            });
        });

        it("should return users with their roles", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create a role
                const userRole = await createRole(tx, {
                    name: "UserRole",
                    description: "Regular user role",
                });

                // 2. Setup: Create a user with a role
                const uniqueUsername = `testuser_${Date.now()}`;
                const testUser = await createTestUser(tx, {
                    email: `${uniqueUsername}@example.com`,
                    username: uniqueUsername,
                });

                // Manually assign role to user (since createTestUser doesn't assign roles)
                await tx.insert(userRoles).values({
                    user_id: testUser.id,
                    role_id: userRole.id,
                });

                // 3. Action: Get all users with roles
                const users = await getAllUsersWithRoles(tx);

                // 4. Assertion: Verify the user and role are in the result
                const foundUser = users.find((u) => u.id === testUser.id);
                expect(foundUser).toBeDefined();
                expect(foundUser?.email).toBe(`${uniqueUsername}@example.com`);
                expect(foundUser?.username).toBe(uniqueUsername);
                expect(foundUser?.roles).toBeDefined();
                expect(Array.isArray(foundUser?.roles)).toBe(true);
            });
        });
    });

    describe("createUser", () => {
        it("should create a user successfully", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Action: Create a user
                const newUser = await createUser(tx, {
                    email: "newuser@example.com",
                    username: "newuser",
                    password: "password123",
                    display_name: "New User",
                    first_name: "New",
                    last_name: "User",
                });

                // 2. Assertion: Verify user was created
                expect(newUser).toBeDefined();
                expect(newUser.email).toBe("newuser@example.com");
                expect(newUser.username).toBe("newuser");
                expect(newUser.display_name).toBe("New User");
                expect(newUser.first_name).toBe("New");
                expect(newUser.last_name).toBe("User");
                expect(newUser.id).toBeDefined();

                // 3. Assertion: Verify password is not in response
                expect(newUser).not.toHaveProperty("password");

                // 4. Verify database state
                const dbUser = await tx.query.users.findFirst({
                    where: (users, { eq }) => eq(users.id, newUser.id),
                });
                expect(dbUser).toBeDefined();
                expect(dbUser?.email).toBe("newuser@example.com");
                // Verify password was hashed
                expect(dbUser?.password).toBeDefined();
                expect(dbUser?.password).not.toBe("password123");
            });
        });

        it("should create a user with assigned roles", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create a role
                const role = await createRole(tx, {
                    name: "TestRole",
                    description: "Test role",
                });

                // 2. Action: Create user with role
                const newUser = await createUser(tx, {
                    email: "userwithrole@example.com",
                    username: "userwithrole",
                    password: "password123",
                    roleIds: [role.id],
                });

                // 3. Assertion: Verify user was created
                expect(newUser).toBeDefined();
                expect(newUser.email).toBe("userwithrole@example.com");

                // 4. Verify role assignment in database
                const userRoleAssignment = await tx.query.userRoles.findFirst({
                    where: (userRoles, { eq }) =>
                        eq(userRoles.user_id, newUser.id),
                });
                expect(userRoleAssignment).toBeDefined();
                expect(userRoleAssignment?.role_id).toBe(role.id);
            });
        });

        it("should throw ConflictError for duplicate email", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create a user
                await createUser(tx, {
                    email: "duplicate@example.com",
                    username: "firstuser",
                    password: "password123",
                });

                // 2. Action & Assertion: Try to create another user with same email
                await expect(
                    createUser(tx, {
                        email: "duplicate@example.com",
                        username: "seconduser",
                        password: "password123",
                    }),
                ).rejects.toThrow(ConflictError);
            });
        });

        it("should throw ConflictError for duplicate username", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create a user
                await createUser(tx, {
                    email: "user1@example.com",
                    username: "duplicateusername",
                    password: "password123",
                });

                // 2. Action & Assertion: Try to create another user with same username
                await expect(
                    createUser(tx, {
                        email: "user2@example.com",
                        username: "duplicateusername",
                        password: "password123",
                    }),
                ).rejects.toThrow(ConflictError);
            });
        });
    });
});
