import { families, familyMembers } from "#server/db/schema";
import type { DbConnection } from "#server/lib/types";
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
