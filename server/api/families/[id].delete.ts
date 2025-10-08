import { and, eq } from "drizzle-orm";
import { defineEventHandler, createError, getRouterParams } from "h3";
import { db } from "#server/db";
import { families, familyMembers } from "#server/db/schema";
import { logger } from "#server/utils/logger";

export default defineEventHandler(async (event) => {
    const { id: familyId } = await getRouterParams(event);
    const user = event.context.user;

    if (!user) {
        throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }

    try {
        // 1. Authorize: Check if the current user is a manager of this family.
        const membership = await db.query.familyMembers.findFirst({
            where: and(
                eq(familyMembers.family_id, familyId),
                eq(familyMembers.user_id, user.id),
            ),
        });

        if (membership?.role !== "manager") {
            throw createError({
                statusCode: 403,
                statusMessage:
                    "Forbidden: Only a family manager can delete the family.",
            });
        }

        // 2. Perform the soft delete by setting the deleted_at timestamp.
        await db
            .update(families)
            .set({ deleted_at: new Date() })
            .where(eq(families.id, familyId));

        logger.info(`Family ${familyId} soft-deleted by manager ${user.id}`);

        event.node.res.statusCode = 204; // No Content
        return;
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
        ) {
            throw error;
        }

        logger.error(`Error soft-deleting family ${familyId}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
