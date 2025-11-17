import { defineEventHandler, createError, getRouterParams, readValidatedBody } from "h3";
import { db } from "#server/db";
import { FamilyTransferOwnershipSchema } from "#shared/types/family";
import { requireAuth } from "#server/utils/auth";
import { transferOwnership } from "#server/services/families";
import { translateError } from "#server/lib/errors";

/**
 * @api {post} /api/families/:id/transfer-ownership
 * @description Transfers family ownership to another member.
 * @requires User must be current family creator
 * @requires New owner must be a family member
 * @param {object} event - The H3 event object.
 * @returns {Promise<object>} Success response.
 */
export default defineEventHandler(async (event) => {
    // 1. Extract params and auth
    const { id: familyId } = getRouterParams(event);
    const session = await requireAuth(event);
    const user = session.user;

    // 2. Validation
    const parseResult = await readValidatedBody(event, (body) =>
        FamilyTransferOwnershipSchema.safeParse(body),
    );

    if (!parseResult.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Validation failed",
            data: parseResult.error.issues,
        });
    }

    const { newOwnerId } = parseResult.data;

    // 3. Call service within transaction
    try {
        const result = await db.transaction(async (tx) => {
            return await transferOwnership(
                tx,
                user.id,
                familyId,
                newOwnerId,
            );
        });

        return result;
    } catch (error) {
        // 4. Translate domain errors to HTTP errors
        throw translateError(error);
    }
});
