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

import { families, familyMembers } from "#server/db/schema";
import type { DbConnection } from "#server/lib/types";
import { InternalError, UnauthorizedError } from "#server/lib/errors";

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

    return insertedFamily;
}
