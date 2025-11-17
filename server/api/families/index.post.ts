import { defineEventHandler, createError, readValidatedBody } from "h3";
import { db } from "#server/db";
import { FamilyCreateSchema } from "~~/shared/types/family";
import { logger } from "#server/utils/logger";
import { createFamily } from "#server/services/families";
import {
    UnauthorizedError,
    ValidationError,
    DomainError,
} from "#server/lib/errors";

/**
 * @api {post} /api/families
 * @description Creates a new family and assigns the creator as the manager.
 * @param {object} event - The H3 event object.
 * @returns {Promise<object>} The newly created family object.
 */
export default defineEventHandler(async (event) => {
    const user = event.context.user;

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: "Unauthorized",
        });
    }

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

    try {
        const newFamily = await db.transaction(async (tx) => {
            return await createFamily(tx, user.id, {
                name: parseResult.data.name,
            });
        });

        return newFamily;
    } catch (error) {
        // Log the error
        logger.error(`Error creating family for user ${user.id}:`, error);

        // Translate domain errors to HTTP errors
        if (error instanceof UnauthorizedError) {
            throw createError({
                statusCode: 401,
                statusMessage: error.message,
            });
        }

        if (error instanceof ValidationError) {
            throw createError({
                statusCode: 400,
                statusMessage: error.message,
                data: error.issues,
            });
        }

        if (error instanceof DomainError) {
            // Handle other domain errors
            throw createError({
                statusCode: 500,
                statusMessage: error.message,
            });
        }

        // Handle unexpected errors
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
