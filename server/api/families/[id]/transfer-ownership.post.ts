import { and, eq, sql } from "drizzle-orm";
import {
    defineEventHandler,
    createError,
    getRouterParams,
    readValidatedBody,
} from "h3";
import { db } from "#server/db";
import { families, familyMembers } from "#server/db/schema";
import { FamilyTransferOwnershipSchema } from "#shared/types/family";
import { logger } from "#server/utils/logger";

/**
 * @api {post} /api/families/:id/transfer-ownership
 * @description Transfers family ownership to another member.
 * @requires User must be current family creator
 * @requires New owner must be a family member
 * @param {object} event - The H3 event object.
 * @returns {Promise<object>} Success response.
 */
export default defineEventHandler(async (event) => {
    const { id: familyId } = getRouterParams(event);
    const user = event.context.user;

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Unauthorized",
        });
    }

    const parseResult = await readValidatedBody(event, (body) =>
        FamilyTransferOwnershipSchema.safeParse(body),
    );

    if (!parseResult.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Validation failed",
            data: parseResult.error.errors,
        });
    }

    const { newOwnerId } = parseResult.data;

    try {
        // Verify current user is creator
        const family = await db.query.families.findFirst({
            where: and(
                eq(families.id, familyId),
                eq(families.creator_id, user.id),
            ),
        });

        if (!family) {
            throw createError({
                statusCode: 403,
                statusMessage: "Only the family creator can transfer ownership",
            });
        }

        // Verify new owner is a member
        const membership = await db.query.familyMembers.findFirst({
            where: and(
                eq(familyMembers.family_id, familyId),
                eq(familyMembers.user_id, newOwnerId),
            ),
        });

        if (!membership) {
            throw createError({
                statusCode: 400,
                statusMessage: "New owner must be a family member",
            });
        }

        // Transfer ownership
        await db
            .update(families)
            .set({
                creator_id: newOwnerId,
                updated_at: sql`now()`,
            })
            .where(eq(families.id, familyId));

        logger.info(
            `Family ${familyId} ownership transferred from ${user.id} to ${newOwnerId}`,
        );

        return { success: true };
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
        ) {
            throw error;
        }

        logger.error(
            `Error transferring ownership for family ${familyId}:`,
            error,
        );
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
