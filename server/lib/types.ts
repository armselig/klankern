import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { db } from "#server/db";
import * as schema from "#server/db/schema";

/**
 * Type for database transactions (both production and test)
 */
export type DbTransaction = PgTransaction<
    PostgresJsQueryResultHKT,
    typeof schema,
    ExtractTablesWithRelations<typeof schema>
>;

/**
 * Database connection type that works for both production and tests.
 * Services accept this type to work with either regular db or test transactions.
 *
 * This allows services to be called with:
 * - Production: db.transaction(async (tx) => service(tx, ...))
 * - Tests: withTestTransaction(async (tx) => service(tx, ...))
 */
export type DbConnection = typeof db | DbTransaction;
