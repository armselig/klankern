import { migrate } from "drizzle-orm/node-postgres/migrator";
import { logger } from "../utils/logger";
import { db } from "./index"; // Assuming db client is exported from index.ts

async function main() {
    try {
        logger.info("Starting migrations...");
        const result = await migrate(db, {
            migrationsFolder: "./server/db/migrations",
        });
        logger.info("Migrations completed successfully!", result);
    } catch (error) {
        logger.error("Error during migrations:", error);
        process.exit(1);
    }
    process.exit(0);
}

void main();
