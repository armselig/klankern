import { defineEventHandler, createError, readValidatedBody } from "h3";
import { db } from "#server/db";
import { FamilyCreateSchema } from "~~/shared/types/family";
import { createFamily } from "#server/services/families";
import { translateError } from "#server/lib/errors";

/**
 * @api {post} /api/families
 * @description Creates a new family and assigns the creator as the manager.
 * @param {object} event - The H3 event object.
 * @returns {Promise<object>} The newly created family object.
 */
export default defineEventHandler(async (event) => {
    // 1. Authentication
    const user = event.context.user;
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Unauthorized",
        });
    }

    // 2. Validation
    const parseResult = await readValidatedBody(event, (body) =>
        FamilyCreateSchema.safeParse(body),
    );

    if (!parseResult.success) {
        throw createError({
            statusCode: 400,
            statusMessage: "Validation failed",
            data: parseResult.error.issues,
        });
    }

    // 3. Call service within transaction
    try {
        const newFamily = await db.transaction(async (tx) => {
            return await createFamily(tx, user.id, parseResult.data);
        });

        return newFamily;
    } catch (error) {
        // 4. Translate domain errors to HTTP errors
        throw translateError(error);
    }
});
