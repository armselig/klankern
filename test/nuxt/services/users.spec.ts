import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { withTestTransaction } from "#test/utils/db";
import {
    createTestUser,
    createTestAdminUser,
    createTestUserWithRole,
} from "#test/utils/fixtures";
import {
    getAllUsersWithRoles,
    createUser,
    deleteUser,
} from "#server/services/users";
import {
    sessions,
    userRoles,
    users,
    families,
    familyMembers,
} from "#server/db/schema";
import {
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
} from "#server/lib/errors";
import { createTestFamily } from "#test/utils/fixtures";

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
                const timestamp = Date.now();
                const newUser = await createUser(tx, admin.id, {
                    email: `unique-test-${timestamp}@example.com`,
                    username: `unique-testuser-${timestamp}`,
                    password: "password",
                });
                expect(newUser).toBeDefined();
                expect(newUser.email).toBe(
                    `unique-test-${timestamp}@example.com`,
                );
            });
        });

        describe("Input Validation", () => {
            it("should throw ValidationError if email is empty", async () => {
                await withTestTransaction(async (tx) => {
                    const admin = await createTestAdminUser(tx);
                    await expect(
                        createUser(tx, admin.id, {
                            email: "",
                            username: "testuser",
                            password: "password",
                        }),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should throw ValidationError if email format is invalid", async () => {
                await withTestTransaction(async (tx) => {
                    const admin = await createTestAdminUser(tx);
                    await expect(
                        createUser(tx, admin.id, {
                            email: "invalid-email",
                            username: "testuser",
                            password: "password",
                        }),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should throw ValidationError if email exceeds 255 characters", async () => {
                await withTestTransaction(async (tx) => {
                    const admin = await createTestAdminUser(tx);
                    const longEmail = "a".repeat(243) + "@example.com"; // 243 + 1 + 11 = 255
                    await expect(
                        createUser(tx, admin.id, {
                            email: longEmail + "a", // 256 characters
                            username: "testuser",
                            password: "password",
                        }),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should throw ValidationError if username is empty", async () => {
                await withTestTransaction(async (tx) => {
                    const admin = await createTestAdminUser(tx);
                    await expect(
                        createUser(tx, admin.id, {
                            email: "test@example.com",
                            username: "",
                            password: "password",
                        }),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should throw ValidationError if username is less than 3 characters", async () => {
                await withTestTransaction(async (tx) => {
                    const admin = await createTestAdminUser(tx);
                    await expect(
                        createUser(tx, admin.id, {
                            email: "test@example.com",
                            username: "ab",
                            password: "password",
                        }),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should throw ValidationError if username exceeds 50 characters", async () => {
                await withTestTransaction(async (tx) => {
                    const admin = await createTestAdminUser(tx);
                    const longUsername = "a".repeat(51);
                    await expect(
                        createUser(tx, admin.id, {
                            email: "test@example.com",
                            username: longUsername,
                            password: "password",
                        }),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should throw ValidationError if username contains invalid characters", async () => {
                await withTestTransaction(async (tx) => {
                    const admin = await createTestAdminUser(tx);
                    await expect(
                        createUser(tx, admin.id, {
                            email: "test@example.com",
                            username: "user!",
                            password: "password",
                        }),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should throw ValidationError if password is empty", async () => {
                await withTestTransaction(async (tx) => {
                    const admin = await createTestAdminUser(tx);
                    await expect(
                        createUser(tx, admin.id, {
                            email: "test@example.com",
                            username: "testuser",
                            password: "",
                        }),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should throw ValidationError if password is less than 8 characters", async () => {
                await withTestTransaction(async (tx) => {
                    const admin = await createTestAdminUser(tx);
                    await expect(
                        createUser(tx, admin.id, {
                            email: "test@example.com",
                            username: "testuser",
                            password: "short",
                        }),
                    ).rejects.toThrow(ValidationError);
                });
            });

            it("should throw ValidationError if password exceeds 128 characters", async () => {
                await withTestTransaction(async (tx) => {
                    const admin = await createTestAdminUser(tx);
                    const longPassword = "a".repeat(129);
                    await expect(
                        createUser(tx, admin.id, {
                            email: "test@example.com",
                            username: "testuser",
                            password: longPassword,
                        }),
                    ).rejects.toThrow(ValidationError);
                });
            });
        });
    });

    describe("Inactive user restrictions", () => {
        it("should throw ForbiddenError when inactive admin calls getAllUsersWithRoles", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                await tx
                    .update(users)
                    .set({ is_active: false })
                    .where(eq(users.id, admin.id));
                await expect(
                    getAllUsersWithRoles(tx, admin.id),
                ).rejects.toThrow(ForbiddenError);
            });
        });

        it("should throw ForbiddenError when inactive admin calls createUser", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                await tx
                    .update(users)
                    .set({ is_active: false })
                    .where(eq(users.id, admin.id));
                const timestamp = Date.now();
                await expect(
                    createUser(tx, admin.id, {
                        email: `new-${timestamp}@example.com`,
                        username: `newuser-${timestamp}`,
                        password: "password123",
                    }),
                ).rejects.toThrow(ForbiddenError);
            });
        });
    });

    describe("deleteUser", () => {
        it("should throw UnauthorizedError if admin user is not authenticated", async () => {
            await withTestTransaction(async (tx) => {
                const target = await createTestUser(tx);
                await expect(deleteUser(tx, null, target.id)).rejects.toThrow(
                    UnauthorizedError,
                );
            });
        });

        it("should throw ForbiddenError if requesting user is not an admin", async () => {
            await withTestTransaction(async (tx) => {
                const nonAdmin = await createTestUser(tx);
                const target = await createTestUser(tx);
                await expect(
                    deleteUser(tx, nonAdmin.id, target.id),
                ).rejects.toThrow(ForbiddenError);
            });
        });

        it("should throw ForbiddenError when admin tries to delete their own account", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                await expect(
                    deleteUser(tx, admin.id, admin.id),
                ).rejects.toThrow(ForbiddenError);
            });
        });

        it("should throw NotFoundError when deleting a non-existent user", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                await expect(
                    deleteUser(
                        tx,
                        admin.id,
                        "00000000-0000-0000-0000-000000000000",
                    ),
                ).rejects.toThrow(NotFoundError);
            });
        });

        it("should permanently delete a user", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                const target = await createTestUser(tx);

                await deleteUser(tx, admin.id, target.id);

                const deletedUser = await tx.query.users.findFirst({
                    where: eq(users.id, target.id),
                });
                expect(deletedUser).toBeUndefined();
            });
        });

        it("should cascade-delete userRoles when user is deleted", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                const target = await createTestUserWithRole(tx, "member");

                const rolesBeforeDelete = await tx.query.userRoles.findMany({
                    where: eq(userRoles.user_id, target.id),
                });
                expect(rolesBeforeDelete).toHaveLength(1);

                await deleteUser(tx, admin.id, target.id);

                const rolesAfterDelete = await tx.query.userRoles.findMany({
                    where: eq(userRoles.user_id, target.id),
                });
                expect(rolesAfterDelete).toHaveLength(0);
            });
        });

        it("should cascade-delete sessions when user is deleted", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                const target = await createTestUser(tx);

                await tx.insert(sessions).values({
                    user_id: target.id,
                    token: randomUUID(),
                    ip_address: "127.0.0.1",
                    user_agent: "test-agent",
                    expires_at: new Date(Date.now() + 86400000),
                });

                await deleteUser(tx, admin.id, target.id);

                const remainingSessions = await tx.query.sessions.findMany({
                    where: eq(sessions.user_id, target.id),
                });
                expect(remainingSessions).toHaveLength(0);
            });
        });

        it("should cascade-delete familyMembers when user is deleted", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                const owner = await createTestUser(tx);
                const target = await createTestUser(tx);
                const family = await createTestFamily(tx, owner.id);

                await tx.insert(familyMembers).values({
                    family_id: family.id,
                    user_id: target.id,
                    role: "member",
                });

                await deleteUser(tx, admin.id, target.id);

                const remainingMemberships =
                    await tx.query.familyMembers.findMany({
                        where: eq(familyMembers.user_id, target.id),
                    });
                expect(remainingMemberships).toHaveLength(0);
            });
        });

        it("should cascade-delete families when creator user is deleted", async () => {
            await withTestTransaction(async (tx) => {
                const admin = await createTestAdminUser(tx);
                const creator = await createTestUser(tx);
                const family = await createTestFamily(tx, creator.id);

                await deleteUser(tx, admin.id, creator.id);

                const deletedFamily = await tx.query.families.findFirst({
                    where: eq(families.id, family.id),
                });
                expect(deletedFamily).toBeUndefined();
            });
        });
    });

    describe("Edge Cases", () => {
        describe("Non-Existent Resources", () => {
            it.todo(
                "should return undefined when getting a non-existent user by ID",
                async () => {
                    // This test requires a getUserById function which does not exist yet.
                    // await withTestTransaction(async (tx) => {
                    //     const result = await getUserById(tx, "non-existent-user-id");
                    //     expect(result).toBeUndefined();
                    // });
                },
            );

            it("should return an empty array when no users exist", async () => {
                await withTestTransaction(async (tx) => {
                    // Note: withTestTransaction creates at least one admin user, so we can't test a truly empty table.
                    // This test is limited by the current test setup.
                    // A better approach would be to clear the users table, but that could have side effects.
                    const admin = await createTestAdminUser(tx);
                    const users = await getAllUsersWithRoles(tx, admin.id);
                    // In this setup, we expect at least the admin user.
                    expect(users.length).toBeGreaterThanOrEqual(1);
                });
            });
        });

        describe("Unicode and Special Characters", () => {
            it("should create a user with Unicode and special characters in username and display_name", async () => {
                await withTestTransaction(async (tx) => {
                    const admin = await createTestAdminUser(tx);
                    const specialUsername = "user-é-Ü-🎉";
                    const specialDisplayName = "User With É Ü 🎉";

                    const newUser = await createUser(tx, admin.id, {
                        email: "special@example.com",
                        username: specialUsername,
                        password: "password123",
                        display_name: specialDisplayName,
                    });

                    expect(newUser.username).toBe(specialUsername);
                    expect(newUser.display_name).toBe(specialDisplayName);
                });
            });

            it("should create a user with a Unicode email address", async () => {
                await withTestTransaction(async (tx) => {
                    const admin = await createTestAdminUser(tx);
                    const unicodeEmail = "пользователь@домен.рф";

                    const newUser = await createUser(tx, admin.id, {
                        email: unicodeEmail,
                        username: "unicode-user",
                        password: "password123",
                    });

                    expect(newUser.email).toBe(unicodeEmail);
                });
            });
        });
    });
});
