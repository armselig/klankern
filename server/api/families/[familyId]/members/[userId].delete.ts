import { and, eq } from "drizzle-orm";
import { defineEventHandler, createError, getRouterParams } from "h3";
import { db } from "#server/db";
import { familyMembers } from "#server/db/schema";
import { logger } from "#server/utils/logger";

export default defineEventHandler(async (event) => {
    const { familyId, userId: userIdToRemove } = await getRouterParams(event);
    const managerUser = event.context.user;

    if (!managerUser) {
        throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
    }

    // 1. Business Rule: Prevent a manager from removing themselves.
    if (managerUser.id === userIdToRemove) {
        throw createError({
            statusCode: 400,
            statusMessage:
                "A manager cannot remove themselves from the family.",
        });
    }

    try {
        // 2. Authorize: Check if the current user is a manager of this family.
        const managerMembership = await db.query.familyMembers.findFirst({
            where: and(
                eq(familyMembers.family_id, familyId),
                eq(familyMembers.user_id, managerUser.id),
            ),
        });

        if (managerMembership?.role !== "manager") {
            throw createError({
                statusCode: 403,
                statusMessage:
                    "Forbidden: Only a family manager can remove members.",
            });
        }

        // 3. Perform Deletion
        const [deletedMembership] = await db
            .delete(familyMembers)
            .where(
                and(
                    eq(familyMembers.family_id, familyId),
                    eq(familyMembers.user_id, userIdToRemove),
                ),
            )
            .returning();

        // 4. Verify that a member was actually removed.
        if (!deletedMembership) {
            throw createError({
                statusCode: 404,
                statusMessage: "Member not found in this family.",
            });
        }

        logger.info(
            `User ${userIdToRemove} removed from family ${familyId} by manager ${managerUser.id}`,
        );

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

        logger.error(
            `Error removing user ${userIdToRemove} from family ${familyId}:`,
            error,
        );
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
