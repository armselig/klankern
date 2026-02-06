import { defineEventHandler, createError } from "h3";
import { db } from "#server/db";
import { familyMembers } from "#server/db/schema";
import { and, eq } from "drizzle-orm";
import { logger } from "#server/utils/logger";
import { notDeleted } from "#server/db/helpers";
import { requireAuth } from "#server/utils/auth";

/**
 * @api {get} /api/families
 * @description Fetches all families the authenticated user is a member of.
 * @returns {Promise<object[]>} An array of family objects.
 */
export default defineEventHandler(async (event) => {
    const session = await requireAuth(event);
    const user = session.user;

    try {
        const userFamilyMemberships = await db.query.familyMembers.findMany({
            where: and(
                eq(familyMembers.user_id, user.id),
                notDeleted(familyMembers),
            ),
            with: {
                family: true, // Include the full family object
            },
        });

        // Extract the family object from each membership record and filter out soft-deleted families
        const families = userFamilyMemberships
            .map((membership) => membership.family)
            .filter((family) => family && !family.deleted_at);

        return families;
    } catch (error) {
        logger.error(`Error fetching families for user ${user.id}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: "Internal Server Error",
        });
    }
});
