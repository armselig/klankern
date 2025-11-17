import { describe, expect, it } from "vitest";
import { withTestTransaction, createTestUser } from "#test/utils";
import { sendVerificationEmail, verifyEmail } from "#server/services/auth";
import {
    UnauthorizedError,
    ValidationError,
    NotFoundError,
} from "#server/lib/errors";
import { eq } from "drizzle-orm";
import { users } from "#server/db/schema";

describe("Email Verification Service", () => {
    describe("sendVerificationEmail", () => {
        it("should throw UnauthorizedError when userId is not provided", async () => {
            await withTestTransaction(async (tx) => {
                // Action & Assertion: Try to send verification without user ID
                await expect(sendVerificationEmail(tx, "")).rejects.toThrow(
                    UnauthorizedError,
                );
            });
        });

        it("should throw NotFoundError if user does not exist", async () => {
            await withTestTransaction(async (tx) => {
                // Action & Assertion: Try to send verification for non-existent user
                // Use a valid UUID format but non-existent ID
                await expect(
                    sendVerificationEmail(
                        tx,
                        "00000000-0000-0000-0000-000000000000",
                    ),
                ).rejects.toThrow(NotFoundError);
            });
        });

        it("should throw ValidationError if email is already verified", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create a user with verified email
                const user = await createTestUser(tx, {
                    email: "verified@example.com",
                    username: "verifieduser",
                });

                // Mark email as verified
                await tx
                    .update(users)
                    .set({ email_verified: true })
                    .where(eq(users.id, user.id));

                // 2. Action & Assertion: Try to send verification for already verified user
                await expect(
                    sendVerificationEmail(tx, user.id),
                ).rejects.toThrow(ValidationError);
            });
        });

        it("should successfully generate verification token for unverified user", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create an unverified user
                const user = await createTestUser(tx, {
                    email: "unverified@example.com",
                    username: "unverifieduser",
                });

                // 2. Action: Send verification email
                const result = await sendVerificationEmail(tx, user.id);

                // 3. Assertion: Verify result
                expect(result).toBeDefined();
                expect(result.success).toBe(true);
                expect(result.token).toBeDefined();
                expect(typeof result.token).toBe("string");
                expect(result.token.length).toBeGreaterThan(0);

                // 4. Assertion: Verify database state
                const updatedUser = await tx.query.users.findFirst({
                    where: eq(users.id, user.id),
                });
                expect(updatedUser?.email_verification_token).toBe(
                    result.token,
                );
                expect(updatedUser?.email_verified).toBe(false);
            });
        });
    });

    describe("verifyEmail", () => {
        it("should throw ValidationError for empty token", async () => {
            await withTestTransaction(async (tx) => {
                // Action & Assertion: Try to verify with empty token
                await expect(verifyEmail(tx, "")).rejects.toThrow(
                    ValidationError,
                );
            });
        });

        it("should throw ValidationError for invalid token", async () => {
            await withTestTransaction(async (tx) => {
                // Action & Assertion: Try to verify with non-existent token
                await expect(
                    verifyEmail(tx, "invalid-token-12345"),
                ).rejects.toThrow(ValidationError);
            });
        });

        it("should throw ValidationError if email is already verified", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create a user and generate token
                const uniqueUsername = `alreadyverified_${Date.now()}`;
                const user = await createTestUser(tx, {
                    email: `${uniqueUsername}@example.com`,
                    username: uniqueUsername,
                });

                const { token } = await sendVerificationEmail(tx, user.id);

                // 2. Manually mark email as verified
                await tx
                    .update(users)
                    .set({ email_verified: true })
                    .where(eq(users.id, user.id));

                // 3. Action & Assertion: Try to verify already verified email
                await expect(verifyEmail(tx, token)).rejects.toThrow(
                    ValidationError,
                );
            });
        });

        it("should successfully verify email with valid token", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create an unverified user
                const user = await createTestUser(tx, {
                    email: "toverify@example.com",
                    username: "toverify",
                });

                // 2. Setup: Generate verification token
                const { token } = await sendVerificationEmail(tx, user.id);

                // 3. Action: Verify email
                const result = await verifyEmail(tx, token);

                // 4. Assertion: Verify result
                expect(result).toBeDefined();
                expect(result.success).toBe(true);

                // 5. Assertion: Verify database state
                const verifiedUser = await tx.query.users.findFirst({
                    where: eq(users.id, user.id),
                });
                expect(verifiedUser?.email_verified).toBe(true);
                expect(verifiedUser?.email_verified_at).toBeDefined();
                expect(verifiedUser?.email_verification_token).toBeNull();
            });
        });

        it("should not allow token reuse after verification", async () => {
            await withTestTransaction(async (tx) => {
                // 1. Setup: Create user and generate token
                const user = await createTestUser(tx, {
                    email: "reuse@example.com",
                    username: "reuse",
                });

                const { token } = await sendVerificationEmail(tx, user.id);

                // 2. First verification
                await verifyEmail(tx, token);

                // 3. Action & Assertion: Try to use same token again
                await expect(verifyEmail(tx, token)).rejects.toThrow(
                    ValidationError,
                );
            });
        });
    });
});
