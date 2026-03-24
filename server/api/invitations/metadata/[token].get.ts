import { and, eq } from "drizzle-orm";
import { createError, defineEventHandler, getRouterParam } from "h3";
import { db } from "#server/db";
import { familyInvitations } from "#server/db/schema";
import { notDeleted } from "#server/db/helpers";
import { logger } from "#server/utils/logger";

/**
 * Public endpoint to retrieve invite metadata for display purposes.
 * Returns only the family name — never the invited email (PII concern;
 * invite tokens can appear in browser history, logs, and shared chats).
 * Email match is validated server-side during registration.
 */
export default defineEventHandler(async (event) => {
    logger.http(`${event.method} ${event.path}`);

    const token = getRouterParam(event, "token");

    if (!token) {
        throw createError({
            statusCode: 400,
            statusMessage: "Token is required.",
        });
    }

    const invitation = await db.query.familyInvitations.findFirst({
        where: and(
            eq(familyInvitations.token, token),
            notDeleted(familyInvitations),
        ),
        with: { family: true },
    });

    if (
        !invitation ||
        invitation.status !== "pending" ||
        new Date() > invitation.expires_at
    ) {
        throw createError({
            statusCode: 404,
            statusMessage: "Invite not found or expired.",
        });
    }

    return { familyName: invitation.family.name };
});
