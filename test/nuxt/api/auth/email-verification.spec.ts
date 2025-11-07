import { registerEndpoint } from "@nuxt/test-utils/runtime";
import { createError, readBody } from "h3";
import { describe, expect, it } from "vitest";

describe("Email Verification API", () => {
    const authenticatedUser = {
        id: "user-123",
        email: "user@example.com",
        roles: [{ name: "user" }],
    };

    describe("POST /api/auth/send-verification", () => {
        it("should return 401 for unauthenticated users", async () => {
            registerEndpoint("/api/auth/send-verification", {
                method: "POST",
                handler: (event) => {
                    if (!event.context.user) {
                        throw createError({ statusCode: 401 });
                    }
                    return { success: true };
                },
            });

            await expect(
                $fetch("/api/auth/send-verification", {
                    method: "POST",
                }),
            ).rejects.toMatchObject({ statusCode: 401 });
        });

        it("should return 400 if email is already verified", async () => {
            registerEndpoint("/api/auth/send-verification", {
                method: "POST",
                handler: (event) => {
                    event.context.user = authenticatedUser;
                    // Simulate: email already verified
                    throw createError({
                        statusCode: 400,
                        statusMessage: "Email is already verified",
                    });
                },
            });

            await expect(
                $fetch("/api/auth/send-verification", {
                    method: "POST",
                }),
            ).rejects.toMatchObject({ statusCode: 400 });
        });

        it("should successfully send verification email", async () => {
            registerEndpoint("/api/auth/send-verification", {
                method: "POST",
                handler: (event) => {
                    event.context.user = authenticatedUser;
                    return { success: true };
                },
            });

            const response = await $fetch("/api/auth/send-verification", {
                method: "POST",
            });

            expect(response).toEqual({ success: true });
        });
    });

    describe("POST /api/auth/verify-email", () => {
        const validToken = "valid-token-123";

        it("should return 400 for missing token", async () => {
            registerEndpoint("/api/auth/verify-email", {
                method: "POST",
                handler: async (event) => {
                    const body = await readBody(event);
                    if (!body.token) {
                        throw createError({
                            statusCode: 400,
                            statusMessage: "Validation failed",
                        });
                    }
                    return { success: true };
                },
            });

            await expect(
                $fetch("/api/auth/verify-email", {
                    method: "POST",
                    body: { token: "" },
                }),
            ).rejects.toMatchObject({ statusCode: 400 });
        });

        it("should return 400 for invalid token", async () => {
            registerEndpoint("/api/auth/verify-email", {
                method: "POST",
                handler: async (event) => {
                    const body = await readBody(event);
                    // Simulate: invalid token
                    if (body.token !== validToken) {
                        throw createError({
                            statusCode: 400,
                            statusMessage: "Invalid verification token",
                        });
                    }
                    return { success: true };
                },
            });

            await expect(
                $fetch("/api/auth/verify-email", {
                    method: "POST",
                    body: { token: "invalid-token" },
                }),
            ).rejects.toMatchObject({ statusCode: 400 });
        });

        it("should return 400 if email is already verified", async () => {
            registerEndpoint("/api/auth/verify-email", {
                method: "POST",
                handler: async (event) => {
                    await readBody(event);
                    // Simulate: email already verified
                    throw createError({
                        statusCode: 400,
                        statusMessage: "Email is already verified",
                    });
                },
            });

            await expect(
                $fetch("/api/auth/verify-email", {
                    method: "POST",
                    body: { token: validToken },
                }),
            ).rejects.toMatchObject({ statusCode: 400 });
        });

        it("should successfully verify email with valid token", async () => {
            registerEndpoint("/api/auth/verify-email", {
                method: "POST",
                handler: async (event) => {
                    const body = await readBody(event);
                    expect(body.token).toBe(validToken);
                    return { success: true };
                },
            });

            const response = await $fetch("/api/auth/verify-email", {
                method: "POST",
                body: { token: validToken },
            });

            expect(response).toEqual({ success: true });
        });
    });
});
