/**
 * Database Connection for Replit PostgreSQL
 * Uses Drizzle ORM with postgres.js driver
 *
 * Replit provides DATABASE_URL environment variable automatically
 * when you add a PostgreSQL database to your project.
 *
 * Fallback to individual PG* variables if DATABASE_URL is not available.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Get database connection string
function getDatabaseUrl(): string {
  // Primary: Use DATABASE_URL (Replit standard)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Fallback: Build from individual PG* variables
  const host = process.env.PGHOST;
  const port = process.env.PGPORT || '5432';
  const database = process.env.PGDATABASE;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;

  if (host && database && user && password) {
    return `postgres://${user}:${password}@${host}:${port}/${database}`;
  }

  // Development fallback - warn and return empty
  console.warn('DATABASE_URL not configured. Database operations will fail.');
  return '';
}

// Create postgres connection
const connectionString = getDatabaseUrl();

// postgres.js client with connection pooling
const client = postgres(connectionString, {
  max: 10, // Maximum connections in pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
  prepare: false, // Disable prepared statements for serverless
});

// Drizzle ORM instance with full schema
export const db = drizzle(client, { schema });

// Export schema types and utilities
export * from './schema.js';

// Export the raw client for advanced operations
export { client as pgClient };

// Database health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await client.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

// Re-export db as default for convenience
export default db;
