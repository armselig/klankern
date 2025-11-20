/**
 * @fileoverview Family management service.
 *
 * Contains business logic for family operations including:
 * - Creating families
 * - Retrieving family information
 * - Managing family membership
 * - Deleting families
 * - Transferring family ownership
 */

import { and, eq } from "drizzle-orm";
import { families, familyMembers, users } from "#server/db/schema";
import type { DbConnection } from "#server/lib/types";
import { findResourceOrThrow } from "#server/lib/validation";
import {
    ForbiddenError,
    InternalError,
    UnauthorizedError,
    ValidationError,
} from "#server/lib/errors";
import { logger } from "#server/utils/logger";

/**
 * Data required to create a new family.
 */
export interface CreateFamilyInput {
    name: string;
}

/**
 * Creates a new family and assigns the creator as the manager.
 *
 * This service function:
 * 1. Creates a new family record with the provided name
 * 2. Adds the creator as the first member with 'manager' role
 * 3. Returns the newly created family
 *
 * @param dbConnection - Database connection (can be `db` or test transaction `tx`)
 * @param userId - ID of the user creating the family
 * @param input - Family creation data
 * @returns The newly created family record
 *
 * @throws {UnauthorizedError} If userId is not provided
 * @throws {InternalError} If family creation fails
 *
 * @example
 * ```typescript
 * // In a route handler
 * const family = await db.transaction(async (tx) => {
 *   return await createFamily(tx, user.id, { name: "Smith Family" });
 * });
 *
 * // In a test
 * await withTestTransaction(async (tx) => {
 *   const family = await createFamily(tx, testUser.id, { name: "Test Family" });
 *   expect(family.name).toBe("Test Family");
 * });
 * ```
 */
export async function createFamily(
    dbConnection: DbConnection,
    userId: string,
    input: CreateFamilyInput,
) {
    // Authorization check
    if (!userId) {
        throw new UnauthorizedError("User ID is required to create a family");
    }

    // Input Validation
    if (!input.name || input.name.trim() === "") {
        throw new ValidationError("Family name cannot be empty");
    }

    if (input.name.length > 100) {
        throw new ValidationError("Family name cannot exceed 100 characters");
    }

    // Step 1: Create the new family record
    const [insertedFamily] = await dbConnection
        .insert(families)
        .values({ name: input.name, creator_id: userId })
        .returning();

    if (!insertedFamily) {
        throw new InternalError("Family creation failed during insert");
    }

    // Step 2: Add the creator as the first member with the 'manager' role
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
    // Authorization: Verify family exists
    const family = await findResourceOrThrow(
        () =>
            dbConnection.query.families.findFirst({
                where: eq(families.id, familyId),
            }),
        "Family",
    );

    // Authorization: Verify current user is creator
    if (family.creator_id !== currentUserId) {
        throw new ForbiddenError(
            "Only the family creator can transfer ownership",
        );
    const family = await findResourceOrThrow(
        () =>
            dbConnection.query.families.findFirst({
                where: and(
                    eq(families.id, familyId),
                    eq(families.creator_id, currentUserId),
                ),
            }),
        "Family",
    );

    // Business rule: New owner must exist
    await findResourceOrThrow(
        () =>
            dbConnection.query.users.findFirst({
                where: eq(users.id, newOwnerId),
            }),
        "User",
    );

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
