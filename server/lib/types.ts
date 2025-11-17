/**
 * @fileoverview Shared type definitions for the service layer.
 *
 * These types enable services to work with both production database connections
 * and test transactions, enabling transaction-based testing without E2E complexity.
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import * as schema from "#server/db/schema";

/**
 * Database connection type that can be either:
 * - Production: The global `db` object from `server/db`
 * - Test: A transaction object `tx` from `withTestTransaction()`
 *
 * Services accept this as a parameter to enable:
 * - Production routes passing `db` for real operations
 * - Test code passing `tx` for isolated, rollback-safe testing
 *
 * @example
 * ```typescript
 * // Service function
 * export async function createFamily(
 *   dbConnection: DbConnection,
 *   userId: string,
 *   data: { name: string }
 * ) {
 *   return await dbConnection.insert(families).values({...});
 * }
 *
 * // Production route
 * const result = await db.transaction(async (tx) => {
 *   return await familyService.createFamily(tx, user.id, data);
 * });
 *
 * // Test code
 * await withTestTransaction(async (tx) => {
 *   const family = await familyService.createFamily(tx, user.id, data);
 *   expect(family.name).toBe(data.name);
 *   // Automatically rolled back
 * });
 * ```
 */
export type DbConnection =
    | NodePgDatabase<typeof schema>
    | PgTransaction<
          PostgresJsQueryResultHKT,
          typeof schema,
          ExtractTablesWithRelations<typeof schema>
      >;
