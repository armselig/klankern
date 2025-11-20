import { eq, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { users } from "#server/db/schema";
import type { DbConnection } from "#server/lib/types";
import {
    UnauthorizedError,
    NotFoundError,
    ValidationError,
} from "#server/lib/errors";
import { logger } from "#server/utils/logger";

/**
 * Expected length of email verification tokens.
 * This matches the output of randomBytes(32).toString('hex') which produces 64 hexadecimal characters.
 */
const EMAIL_VERIFICATION_TOKEN_LENGTH = 64;

/**
 * Generates a verification token and stores it for the user.
 * Note: Email sending is not yet implemented.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @param userId - ID of the user requesting verification
 * @returns Object with success status and generated token
 * @throws {UnauthorizedError} If userId is not provided
 * @throws {NotFoundError} If user is not found
 * @throws {ValidationError} If email is already verified
 */
export async function sendVerificationEmail(
    dbConnection: DbConnection,
    userId: string,
) {
    if (!userId || userId.trim() === "") {
        throw new UnauthorizedError("User ID is required");
    }

    // Check if email is already verified
    const userRecord = await dbConnection.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!userRecord) {
        throw new NotFoundError("User not found");
    }

    if (userRecord.email_verified) {
        throw new ValidationError("Email is already verified");
    }

    // Generate verification token
    const token = randomBytes(32).toString("hex");

    // Update user with verification token
    await dbConnection
        .update(users)
        .set({ email_verification_token: token })
        .where(eq(users.id, userId));

    // Note: Email sending functionality not yet implemented.
    // When implemented, send email with verification link:
    // const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
    // await sendVerificationEmail(userRecord.email, verificationUrl);

    logger.info(`Verification token generated for user ${userId}`);

    return {
        success: true,
        message:
            "Verification token generated. Email sending not yet implemented.",
        token, // Only for testing purposes
    };
}

/**
 * Verifies a user's email with the provided token.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @param token - The verification token
 * @returns Object with success status
 * @throws {ValidationError} If token is invalid or email is already verified
 */
export async function verifyEmail(dbConnection: DbConnection, token: string) {
    if (!token || token.trim().length === 0) {
        throw new ValidationError("Verification token is required");
    }

    // Hex string validation (matches randomBytes(32).toString('hex') output)
    const tokenPattern = new RegExp(
        `^[0-9a-fA-F]{${EMAIL_VERIFICATION_TOKEN_LENGTH}}$`,
    );
    if (!tokenPattern.test(token)) {
        throw new ValidationError("Invalid verification token format");
    }

    const userRecord = await dbConnection.query.users.findFirst({
        where: eq(users.email_verification_token, token),
    });

    if (!userRecord) {
        throw new ValidationError("Invalid verification token");
    }

    if (userRecord.email_verified) {
        throw new ValidationError("Email is already verified");
    }

    // Mark email as verified
    await dbConnection
        .update(users)
        .set({
            email_verified: true,
            email_verified_at: sql`now()`,
            email_verification_token: null,
        })
        .where(eq(users.id, userRecord.id));

    logger.info(`Email verified for user ${userRecord.id}`);

    return { success: true };
}
