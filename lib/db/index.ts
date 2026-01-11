/**
 * Database Connection for Vercel Postgres (Neon)
 * Uses Drizzle ORM for type-safe database operations
 */

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from './schema';

// Create Drizzle ORM instance with Vercel Postgres
export const db = drizzle(sql, { schema });

// Re-export schema for convenience
export * from './schema';

// Export sql for raw queries if needed
export { sql };
