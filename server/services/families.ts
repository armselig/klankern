import { and, eq } from "drizzle-orm";
import { families, familyMembers, users } from "#server/db/schema";
import type { DbConnection } from "#server/lib/types";
import { findResourceOrThrow } from "#server/lib/validation";
import { notDeleted } from "#server/db/helpers";
import {
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
} from "#server/lib/errors";
import { logger } from "#server/utils/logger";

/**
 * Creates a new family with the specified user as creator and manager.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @param userId - ID of the user creating the family
 * @param data - Family creation data
 * @returns The newly created family
 * @throws {Error} If family creation fails during insert
 */
export async function createFamily(
    dbConnection: DbConnection,
    userId: string,
    data: { name: string },
) {
    // Authorization check
    if (!userId) {
        throw new UnauthorizedError("User ID is required to create a family");
    }

    // Input Validation
    if (!data.name || data.name.trim().length < 3) {
        throw new ValidationError(
            "Family name must be at least 3 characters long",
        );
    }

    if (data.name.length > 100) {
        throw new ValidationError("Family name cannot exceed 100 characters");
    }

    // Business logic: Create family and add creator as manager
    const [insertedFamily] = await dbConnection
        .insert(families)
        .values({
            name: data.name,
            creator_id: userId,
        })
        .returning();

    if (!insertedFamily) {
        logger.error(`Family creation failed for user ${userId}`);
        throw new Error("Family creation failed during insert");
    }

    await dbConnection.insert(familyMembers).values({
        family_id: insertedFamily.id,
        user_id: userId,
        role: "manager",
    });

    logger.info(`Family created: ${insertedFamily.id} by user ${userId}`);

    return insertedFamily;
}

export async function transferOwnership(
    dbConnection: DbConnection,
    currentUserId: string,
    familyId: string,
    newOwnerId: string,
) {
    // Authorization: Verify family exists and is not soft-deleted
    const family = await findResourceOrThrow(
        () =>
            dbConnection.query.families.findFirst({
                where: and(eq(families.id, familyId), notDeleted(families)),
            }),
        "Family",
    );

    // Authorization: Verify current user is the creator of the family
    if (family.creator_id !== currentUserId) {
        throw new ForbiddenError(
            "Only the family creator can transfer ownership",
        );
    }

    // Business rule: New owner must exist
    await findResourceOrThrow(
        () =>
            dbConnection.query.users.findFirst({
                where: eq(users.id, newOwnerId),
            }),
        "User",
    );

    // Business rule: New owner must be an active (non-soft-deleted) member
    const membership = await dbConnection.query.familyMembers.findFirst({
        where: and(
            eq(familyMembers.family_id, familyId),
            eq(familyMembers.user_id, newOwnerId),
            notDeleted(familyMembers),
        ),
    });

    if (!membership) {
        throw new ValidationError("New owner must be a family member");
    }

    // Transfer ownership
    await dbConnection
        .update(families)
        .set({
            creator_id: newOwnerId,
            updated_at: new Date(),
        })
        .where(eq(families.id, familyId));

    logger.info(
        `Family ${familyId} ownership transferred from ${currentUserId} to ${newOwnerId}`,
    );

    return { success: true };
}
