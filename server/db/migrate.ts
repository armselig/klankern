import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './index'; // Assuming db client is exported from index.ts
import logger from '../utils/logger';

async function main() {
  try {
    await migrate(db, { migrationsFolder: './server/db/migrations' });
    logger.info('Migrations completed successfully!');
  } catch (error) {
    logger.error('Error during migrations:', error);
    process.exit(1);
  }
  process.exit(0);
}

main();
