import { eq, sql } from "drizzle-orm";
import { defineEventHandler, createError, readValidatedBody } from "h3";
import { db } from "#server/db";
import { users } from "#server/db/schema";
import { verifyEmailSchema } from "#shared/types/auth";
import { logger } from "#server/utils/logger";

/**
 * @api {post} /api/auth/verify-email
 * @description Verifies user email with token.
 * @param {object} event - The H3 event object.
 * @returns {Promise<object>} Success response.
 */
export default defineEventHandler(async (event) => {
    const parseResult = await readValidatedBody(event, (body) =>
        verifyEmailSchema.safeParse(body),
    );

    if (!parseResult.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Validation failed",
            data: parseResult.error.errors,
        });
    }

    const { token } = parseResult.data;

    try {
        const userRecord = await db.query.users.findFirst({
            where: eq(users.email_verification_token, token),
        });

        if (!userRecord) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invalid verification token",
            });
        }

        if (userRecord.email_verified) {
            throw createError({
                statusCode: 400,
                statusMessage: "Email is already verified",
            });
        }

        // Mark email as verified
        await db
            .update(users)
            .set({
                email_verified: true,
                email_verified_at: sql`now()`,
                email_verification_token: null,
            })
            .where(eq(users.id, userRecord.id));

        logger.info(`Email verified for user ${userRecord.id}`);

        return { success: true };
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
        ) {
            throw error;
        }

        logger.error("Error verifying email:", error);
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
