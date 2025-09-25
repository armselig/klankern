import { migrate } from 'drizzle-orm/pg-core/migrator';
import { db } from './index'; // Assuming db client is exported from index.ts

async function main() {
  try {
    await migrate(db, { migrationsFolder: './server/db/migrations' });
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Error during migrations:', error);
    process.exit(1);
  }
  process.exit(0);
}

main();
