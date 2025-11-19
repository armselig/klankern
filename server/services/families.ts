import { and, eq } from "drizzle-orm";
import { families, familyMembers } from "#server/db/schema";
import type { DbConnection } from "#server/lib/types";
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
    if (!data.name || data.name.trim() === "") {
        throw new ValidationError("Family name cannot be empty");
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

/**
 * Transfers family ownership to another member.
 *
 * @param dbConnection - Database connection (db or transaction)
 * @param currentUserId - ID of the current owner
 * @param familyId - ID of the family
 * @param newOwnerId - ID of the new owner
 * @returns Success indicator
 * @throws {ForbiddenError} If current user is not the creator
 * @throws {NotFoundError} If family not found
 * @throws {ValidationError} If new owner is not a family member
 */
export async function transferOwnership(
    dbConnection: DbConnection,
    currentUserId: string,
    familyId: string,
    newOwnerId: string,
) {
    // Authorization: Verify current user is creator
    const family = await dbConnection.query.families.findFirst({
        where: and(
            eq(families.id, familyId),
            eq(families.creator_id, currentUserId),
        ),
    });

    if (!family) {
        throw new ForbiddenError(
            "Only the family creator can transfer ownership",
        );
    }

    // Business rule: New owner must be a member
    const membership = await dbConnection.query.familyMembers.findFirst({
        where: and(
            eq(familyMembers.family_id, familyId),
            eq(familyMembers.user_id, newOwnerId),
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
