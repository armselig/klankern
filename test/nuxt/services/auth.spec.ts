import { describe, it, expect } from "vitest";
import { withTestTransaction } from "#test/utils/db";
import { createTestUser } from "#test/utils/fixtures";
import { sendVerificationEmail, verifyEmail } from "#server/services/auth";
import { ForbiddenError, ValidationError } from "#server/lib/errors";
import { users } from "#server/db/schema";
import { eq } from "drizzle-orm";

describe("Service: auth", () => {
    describe("Email Verification Flow", () => {
        it("should successfully verify email with valid token", async () => {
            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx, {
                    email: "unverified@example.com",
                    username: "unverified",
                });

                // Generate verification token
                const { token } = await sendVerificationEmail(tx, user.id);

                // Verify email with token
                const result = await verifyEmail(tx, token);

                expect(result.success).toBe(true);

                // Verify database state
                const verifiedUser = await tx.query.users.findFirst({
                    where: eq(users.id, user.id),
                });
                expect(verifiedUser?.email_verified).toBe(true);
            });
        });

        it("should reject invalid verification token", async () => {
            await withTestTransaction(async (tx) => {
                const invalidToken = "invalid-token-12345";

                await expect(verifyEmail(tx, invalidToken)).rejects.toThrow(
                    ValidationError,
                );
            });
        });

        it("should prevent token reuse", async () => {
            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx);
                const { token } = await sendVerificationEmail(tx, user.id);

                // First verification succeeds
                await verifyEmail(tx, token);

                // Second verification with same token should fail
                await expect(verifyEmail(tx, token)).rejects.toThrow(
                    ValidationError,
                );
            });
        });

        // Note: Expiration test is not implemented because the current implementation
        // of sendVerificationEmail does not set an expiration date for the token.
        // This test should be added when token expiration is implemented.
        it.todo("should reject expired verification token", async () => {
            // 1. Create a user
            // 2. Generate a token for the user
            // 3. Manually update the token's creation date to be in the past
            // 4. Attempt to verify the email with the expired token
            // 5. Expect a ValidationError
        });
        it("should reject malformed verification token", async () => {
            await withTestTransaction(async (tx) => {
                const malformedToken = "not-a-hex-string";
                await expect(verifyEmail(tx, malformedToken)).rejects.toThrow(
                    ValidationError,
                );
            });
        });

        it("should reject empty verification token", async () => {
            await withTestTransaction(async (tx) => {
                await expect(verifyEmail(tx, "")).rejects.toThrow(
                    ValidationError,
                );
            });
        });

        it("should throw ForbiddenError when inactive user requests email verification", async () => {
            await withTestTransaction(async (tx) => {
                const user = await createTestUser(tx);
                await tx
                    .update(users)
                    .set({ is_active: false })
                    .where(eq(users.id, user.id));
                await expect(
                    sendVerificationEmail(tx, user.id),
                ).rejects.toThrow(ForbiddenError);
            });
        });
    });
});
