/**
 * @fileoverview Database helper functions for common query patterns
 *
 * Provides utility functions for working with soft deletes and other
 * common database operations.
 */

import { SQL, isNull } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { db } from "#server/db";
import {
    families,
    familyMembers,
    familyInvitations,
    corkboardPosts,
} from "#server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Creates a filter condition for records that are not soft-deleted.
 * Use this helper to ensure soft-deleted records are excluded from queries.
 *
 * @template T - Table type with a deleted_at column
 * @param {T} table - The table to filter
 * @returns {SQL} SQL condition for non-deleted records
 *
 * @example
 * const members = await db
 *   .select()
 *   .from(familyMembers)
 *   .where(and(
 *     eq(familyMembers.family_id, familyId),
 *     notDeleted(familyMembers)
 *   ));
 */
export function notDeleted<T extends PgTable>(
    table: T,
): SQL<unknown> | undefined {
    // Check if the table has a deleted_at column
    if ("deleted_at" in table) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return isNull((table as any).deleted_at);
    }
    return undefined;
}

/**
 * Restores a soft-deleted family and all its related records.
 * This function runs within a transaction to ensure data consistency.
 *
 * @param {string} familyId - UUID of the family to restore
 * @returns {Promise<void>}
 * @throws {Error} If the restore operation fails
 *
 * @example
 * await restoreFamily('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
 */
export async function restoreFamily(familyId: string): Promise<void> {
    await db.transaction(async (tx) => {
        // Restore the family
        await tx
            .update(families)
            .set({ deleted_at: null })
            .where(eq(families.id, familyId));

        // Restore related family members
        await tx
            .update(familyMembers)
            .set({ deleted_at: null })
            .where(eq(familyMembers.family_id, familyId));

        // Restore related invitations
        await tx
            .update(familyInvitations)
            .set({ deleted_at: null })
            .where(eq(familyInvitations.family_id, familyId));

        // Restore related corkboard posts
        await tx
            .update(corkboardPosts)
            .set({ deleted_at: null })
            .where(eq(corkboardPosts.family_id, familyId));
    });
}
