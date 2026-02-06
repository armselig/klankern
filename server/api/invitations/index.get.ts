import { and, eq } from "drizzle-orm";
import { defineEventHandler, createError } from "h3";
import { db } from "#server/db";
import { familyInvitations } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import { notDeleted } from "#server/db/helpers";
import { requireAuth } from "#server/utils/auth";

export default defineEventHandler(async (event) => {
    const session = await requireAuth(event);
    const user = session.user;

    try {
        const pendingInvitations = await db.query.familyInvitations.findMany({
            where: and(
                eq(familyInvitations.invited_email, user.email),
                eq(familyInvitations.status, "pending"),
                notDeleted(familyInvitations),
            ),
            // Include related family and inviter names for display on the frontend
            with: {
                family: {
                    columns: {
                        name: true,
                    },
                },
                invitedByUser: {
                    columns: {
                        display_name: true,
                        username: true,
                    },
                },
            },
            orderBy: (invitations, { desc }) => [desc(invitations.created_at)],
        });

        // Filter out invitations where the family itself is soft-deleted
        const activeInvitations = pendingInvitations.filter(
            (invitation) => invitation.family && !invitation.family.deleted_at,
        );

        return activeInvitations;
    } catch (error) {
        logger.error(`Error fetching invitations for user ${user.id}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
