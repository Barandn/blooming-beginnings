/**
 * Database Schema - Simplified for Game Scores
 * Uses Drizzle ORM with Neon Postgres
 *
 * Tables:
 * 1. users - Wallet-based authentication
 * 2. siwe_nonces - SIWE authentication nonces
 * 3. game_scores - Game scores with moves and time tracking
 */

import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  varchar,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Users Table
 * Simple wallet-based authentication
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Unique identifier (wallet-based nullifier)
  nullifierHash: text('nullifier_hash').notNull().unique(),

  // User's wallet address
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),

  // Verification level (wallet or orb)
  verificationLevel: varchar('verification_level', { length: 20 }).notNull().default('wallet'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
}, (table) => [
  uniqueIndex('users_nullifier_hash_idx').on(table.nullifierHash),
  index('users_wallet_address_idx').on(table.walletAddress),
]);

/**
 * SIWE Nonces Table
 * For Sign-In With Ethereum authentication
 */
export const siweNonces = pgTable('siwe_nonces', {
  nonce: text('nonce').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Game Scores Table
 * Simple scoring based on moves and time
 *
 * Leaderboard ranking:
 * - Primary: Fewer moves = better
 * - Secondary: Faster time = better (for same moves)
 */
export const gameScores = pgTable('game_scores', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Reference to user
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Game type
  gameType: varchar('game_type', { length: 50 }).notNull().default('card_match'),

  // Game metrics
  moves: integer('moves').notNull(), // Total moves/flips made
  timeSeconds: integer('time_seconds').notNull(), // Time to complete in seconds
  matchedPairs: integer('matched_pairs').notNull(), // Number of matched pairs

  // Session for duplicate prevention
  sessionId: uuid('session_id'),

  // Period for monthly leaderboard (YYYY-MM)
  leaderboardPeriod: varchar('leaderboard_period', { length: 7 }).notNull(),

  // Timestamp
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('game_scores_user_id_idx').on(table.userId),
  index('game_scores_period_idx').on(table.leaderboardPeriod),
  index('game_scores_moves_idx').on(table.moves),
  index('game_scores_time_idx').on(table.timeSeconds),
  // Composite index for leaderboard queries
  index('game_scores_period_moves_time_idx').on(
    table.leaderboardPeriod,
    table.moves,
    table.timeSeconds
  ),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  gameScores: many(gameScores),
}));

export const gameScoresRelations = relations(gameScores, ({ one }) => ({
  user: one(users, {
    fields: [gameScores.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SiweNonce = typeof siweNonces.$inferSelect;
export type NewSiweNonce = typeof siweNonces.$inferInsert;
export type GameScore = typeof gameScores.$inferSelect;
export type NewGameScore = typeof gameScores.$inferInsert;
