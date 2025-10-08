import { eq } from "drizzle-orm";
import { defineEventHandler, createError, getRouterParams } from "h3";
import { db } from "#server/db";
import { familyInvitations } from "#server/db/schema";
import { logger } from "#server/utils/logger";

export default defineEventHandler(async (event) => {
    const { invitationToken } = await getRouterParams(event);
    const user = event.context.user;

    if (!user) {
        throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }

    if (!invitationToken) {
        throw createError({ statusCode: 400, statusMessage: "Invalid token" });
    }

    try {
        // 1. Find the invitation
        const invitation = await db.query.familyInvitations.findFirst({
            where: eq(familyInvitations.token, invitationToken),
        });

        if (!invitation) {
            throw createError({
                statusCode: 404,
                statusMessage: "Invitation not found",
            });
        }

        // 2. Validate the invitation
        if (invitation.status !== "pending") {
            throw createError({
                statusCode: 400,
                statusMessage: `Invitation has already been ${invitation.status}.`,
            });
        }

        if (new Date() > invitation.expires_at) {
            throw createError({
                statusCode: 400,
                statusMessage: "Invitation has expired.",
            });
        }

        if (invitation.invited_email !== user.email) {
            throw createError({
                statusCode: 403,
                statusMessage: "This invitation is for a different user.",
            });
        }

        // 3. Update the invitation status
        await db
            .update(familyInvitations)
            .set({ status: "declined" })
            .where(eq(familyInvitations.id, invitation.id));

        logger.info(
            `User ${user.id} declined invitation ${invitation.id} for family ${invitation.family_id}`,
        );

        return { message: "Invitation declined successfully." };
    } catch (error) {
        // Type guard for H3 errors to re-throw them
        if (
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
        ) {
            throw error;
        }

        logger.error(`Error declining invitation ${invitationToken}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
