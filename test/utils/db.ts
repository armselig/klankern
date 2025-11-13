import { db } from "~~/server/db";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import * as schema from "~/server/db/schema";

// Define a type for our transaction object to ensure type safety
export type TestTransaction = PgTransaction<
    PostgresJsQueryResultHKT,
    typeof schema,
    ExtractTablesWithRelations<typeof schema>
>;

/**
 * Wraps a test function in a database transaction and automatically rolls it back.
 *
 * @param testFn - The test function to execute, which receives the transaction object.
 * @returns A promise that resolves when the test function completes.
 */
export async function withTestTransaction(
    testFn: (tx: TestTransaction) => Promise<void>,
): Promise<void> {
    try {
        await db.transaction(async (tx) => {
            await testFn(tx as TestTransaction);
            // Force rollback by calling rollback()
            // This will throw a "Rollback" error which we catch below
            tx.rollback();
        });
    } catch (error) {
        // Drizzle throws an error when rollback() is called
        // This is expected behavior for transaction rollback, so we catch it
        if (error instanceof Error && error.message !== "Rollback") {
            // Re-throw any error that isn't the expected rollback error
            throw error;
        }
    }
}
