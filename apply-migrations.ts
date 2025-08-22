import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function main() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }

  console.log('íº€ Connecting to PostgreSQL database...');
  
  // Create the PostgreSQL client with SSL enabled for Neon
  const migrationClient = postgres(process.env.POSTGRES_URL, { ssl: true });
  
  // Create Drizzle instance
  const db = drizzle(migrationClient);
  
  console.log('íº€ Running migrations...');
  
  // Run migrations
  await migrate(db, {
    migrationsFolder: path.join(__dirname, 'lib/db/migrations')
  });
  
  console.log('âœ… Migrations completed successfully!');
  
  // Close the connection
  await migrationClient.end();
  process.exit(0);
}

main().catch(err => {
  console.error('âŒ Migration failed:', err);
  process.exit(1);
});
