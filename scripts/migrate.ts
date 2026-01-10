/**
 * Database Migration Script
 * Run with: npm run db:migrate
 *
 * This script creates all tables in the database using Drizzle ORM.
 * It's safe to run multiple times - Drizzle handles migrations idempotently.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Get database URL
function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.PGHOST;
  const port = process.env.PGPORT || '5432';
  const database = process.env.PGDATABASE;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;

  if (host && database && user && password) {
    return `postgres://${user}:${password}@${host}:${port}/${database}`;
  }

  throw new Error('DATABASE_URL or PG* environment variables must be set');
}

async function runMigration() {
  console.log('Starting database migration...');

  const connectionString = getDatabaseUrl();
  console.log('Connecting to database...');

  // Create migration client
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    // Run migrations from drizzle folder
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    await migrationClient.end();
    console.log('Database connection closed.');
  }
}

runMigration();
