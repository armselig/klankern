import { and, eq } from "drizzle-orm";
import { defineEventHandler, createError } from "h3";
import { db } from "#server/db";
import { familyInvitations } from "#server/db/schema";
import { logger } from "#server/utils/logger";

export default defineEventHandler(async (event) => {
    const user = event.context.user;

    if (!user) {
        throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }

    try {
        const pendingInvitations = await db.query.familyInvitations.findMany({
            where: and(
                eq(familyInvitations.invited_email, user.email),
                eq(familyInvitations.status, "pending"),
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

        return pendingInvitations;
    } catch (error) {
        logger.error(`Error fetching invitations for user ${user.id}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
