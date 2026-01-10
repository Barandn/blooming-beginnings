/**
 * Drizzle Kit Configuration
 * For Replit PostgreSQL database
 *
 * Usage:
 * - npm run db:generate - Generate migrations
 * - npm run db:push - Push schema to database
 * - npm run db:studio - Open Drizzle Studio
 */

import { defineConfig } from 'drizzle-kit';

// Get database URL from environment
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

export default defineConfig({
  // Schema location
  schema: './lib/db/schema.ts',

  // Output migrations directory
  out: './drizzle',

  // Database driver
  dialect: 'postgresql',

  // Database credentials
  dbCredentials: {
    url: getDatabaseUrl(),
  },

  // Verbose logging
  verbose: true,

  // Strict mode
  strict: true,
});
