import { describe, it, expect } from "vitest";
import { withTestTransaction } from "#test/utils/db";
import { createTestUser, createTestAdminUser } from "#test/utils/fixtures";
import { getAllUsersWithRoles, createUser } from "#server/services/users";
import { UnauthorizedError, ForbiddenError, ValidationError } from "#server/lib/errors";

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
                    ).rejects.toThrow("ValidationError");
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
                    ).rejects.toThrow("ValidationError");
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
                    ).rejects.toThrow("ValidationError");
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
                    ).rejects.toThrow("ValidationError");
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
                    ).rejects.toThrow("ValidationError");
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
                    ).rejects.toThrow("ValidationError");
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
                    ).rejects.toThrow("ValidationError");
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
                    ).rejects.toThrow("ValidationError");
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
                    ).rejects.toThrow("ValidationError");
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
                    ).rejects.toThrow("ValidationError");
                });
            });
        });
    });
});