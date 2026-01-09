/**
 * Database Connection for Neon Postgres
 * Uses Drizzle ORM for type-safe database operations
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Create Neon SQL client
const sql = neon(process.env.POSTGRES_URL!);

// Create Drizzle ORM instance with Neon Postgres
export const db = drizzle(sql, { schema });

// Re-export schema for convenience
export * from './schema';

// Export sql for raw queries if needed
export { sql };
