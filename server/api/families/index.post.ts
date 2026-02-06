import { defineEventHandler, createError, readValidatedBody } from "h3";
import { db } from "#server/db";
import { families, familyMembers } from "#server/db/schema";
import { FamilyCreateSchema } from "~~/shared/types/family";
import { logger } from "#server/utils/logger";
import { requireAuth } from "#server/utils/auth";

/**
 * @api {post} /api/families
 * @description Creates a new family and assigns the creator as the manager.
 * @param {object} event - The H3 event object.
 * @returns {Promise<object>} The newly created family object.
 */
export default defineEventHandler(async (event) => {
    const session = await requireAuth(event);
    const user = session.user;

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

    const { name } = parseResult.data;

    try {
        const newFamily = await db.transaction(async (tx) => {
            // Step 1: Create the new family record
            const [insertedFamily] = await tx
                .insert(families)
                .values({ name, creator_id: user.id })
                .returning();

            if (!insertedFamily) {
                throw new Error("Family creation failed during insert.");
            }

            // Step 2: Add the creator as the first member with the 'manager' role
            await tx.insert(familyMembers).values({
                family_id: insertedFamily.id,
                user_id: user.id,
                role: "manager",
            });

            return insertedFamily;
        });

        return newFamily;
    } catch (error) {
        logger.error(`Error creating family for user ${user.id}:`, error);
        throw createError({
            statusCode: 500,
            statusMessage: "An unexpected error occurred.",
        });
    }
});
