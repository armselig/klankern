import { and, eq } from "drizzle-orm";
import { defineEventHandler, createError, getRouterParams } from "h3";
import { db } from "#server/db";
import { familyMembers } from "#server/db/schema";
import { logger } from "#server/utils/logger";
import { notDeleted } from "#server/db/helpers";
import { requireAuth } from "#server/utils/auth";

export default defineEventHandler(async (event) => {
    const { familyId } = await getRouterParams(event);
    const session = await requireAuth(event);
    const user = session.user;

    try {
        // 1. Authorize: Ensure the current user is a member of the family they are trying to view.
        const currentUserMembership = await db.query.familyMembers.findFirst({
            where: and(
                eq(familyMembers.family_id, familyId),
                eq(familyMembers.user_id, user.id),
                notDeleted(familyMembers),
            ),
        });

        if (!currentUserMembership) {
            throw createError({
                statusCode: 403,
                statusMessage:
                    "Forbidden: You are not a member of this family.",
            });
        }

        // 2. Fetch all active (non-soft-deleted) members of the family and their user details.
        const memberships = await db.query.familyMembers.findMany({
            where: and(
                eq(familyMembers.family_id, familyId),
                notDeleted(familyMembers),
            ),
            with: {
                user: {
                    columns: {
                        id: true,
                        username: true,
                        display_name: true,
                        email: true,
                    },
                },
            },
        });

        // 3. Format the response to be a clean list of members.
        const memberList = memberships.map((m) => ({
            user_id: m.user.id,
            username: m.user.username,
            display_name: m.user.display_name,
            email: m.user.email,
            role: m.role,
        }));

        return memberList;
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
        ) {
            throw error;
        }

        logger.error(`Error fetching members for family ${familyId}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
