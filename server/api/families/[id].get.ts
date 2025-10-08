import { eq } from "drizzle-orm";
import { defineEventHandler, createError, getRouterParams } from "h3";
import { db } from "#server/db";
import { families } from "#server/db/schema";
import { logger } from "#server/utils/logger";

export default defineEventHandler(async (event) => {
    const { id: familyId } = await getRouterParams(event);
    const user = event.context.user;

    if (!user) {
        throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }

    try {
        // 1. Fetch the family and all its members in a single query.
        const familyData = await db.query.families.findFirst({
            where: eq(families.id, familyId),
            with: {
                members: {
                    with: {
                        user: {
                            columns: {
                                id: true,
                                username: true,
                                display_name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!familyData) {
            throw createError({
                statusCode: 404,
                statusMessage: "Family not found",
            });
        }

        // 2. Authorize: Check if the current user is in the list of members.
        const isCurrentUserMember = familyData.members.some(
            (member) => member.user_id === user.id,
        );

        if (!isCurrentUserMember) {
            throw createError({ statusCode: 403, statusMessage: "Forbidden" });
        }

        // 3. Format the response.
        const response = {
            id: familyData.id,
            name: familyData.name,
            members: familyData.members.map((m) => ({
                userId: m.user.id,
                username: m.user.username,
                displayName: m.user.display_name,
                role: m.role,
            })),
        };

        return response;
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
        ) {
            throw error;
        }

        logger.error(`Error fetching details for family ${familyId}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
