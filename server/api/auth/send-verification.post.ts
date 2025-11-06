import { eq } from "drizzle-orm";
import { defineEventHandler, createError } from "h3";
import { randomBytes } from "crypto";
import { db } from "#server/db";
import { users } from "#server/db/schema";
import { logger } from "#server/utils/logger";

/**
 * @api {post} /api/auth/send-verification
 * @description Sends email verification link to user.
 * @requires User must be authenticated
 * @param {object} event - The H3 event object.
 * @returns {Promise<object>} Success response.
 */
export default defineEventHandler(async (event) => {
    const user = event.context.user;

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Unauthorized",
        });
    }

    try {
        // Check if email is already verified
        const userRecord = await db.query.users.findFirst({
            where: eq(users.id, user.id),
        });

        if (!userRecord) {
            throw createError({
                statusCode: 404,
                statusMessage: "User not found",
            });
        }

        if (userRecord.email_verified) {
            throw createError({
                statusCode: 400,
                statusMessage: "Email is already verified",
            });
        }

        // Generate verification token
        const token = randomBytes(32).toString("hex");

        // Update user with verification token
        await db
            .update(users)
            .set({ email_verification_token: token })
            .where(eq(users.id, user.id));

        // Note: Email sending functionality not yet implemented.
        // When implemented, send email with verification link:
        // const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
        // await sendVerificationEmail(userRecord.email, verificationUrl);

        logger.info(`Verification token generated for user ${user.id}`);

        return {
            success: true,
            message:
                "Verification token generated. Email sending not yet implemented.",
        };
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
        ) {
            throw error;
        }

        logger.error(
            `Error sending verification email for user ${user.id}:`,
            error,
        );
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
