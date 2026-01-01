/**
 * Database Schema for World App Mini-App
 * Uses Drizzle ORM with Vercel Postgres (Neon)
 *
 * Tables:
 * 1. users - Identity mapping (nullifier_hash → wallet_address)
 * 2. claim_transactions - Token distribution log
 * 3. game_scores - Validated game scores for leaderboard
 * 4. sessions - User session management
 */

import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
  varchar,
  bigint,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Users Table
 * Links World ID nullifier_hash with wallet address
 * Enforces unique human identity (anti-bot protection)
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),

  // World ID unique identifier (nullifier_hash)
  // This is unique per user per app - prevents multi-wallet farming
  nullifierHash: text('nullifier_hash').notNull().unique(),

  // User's wallet address on World Chain
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),

  // Verification level (must be 'orb' for our app)
  verificationLevel: varchar('verification_level', { length: 20 }).notNull().default('orb'),

  // Merkle root at time of verification
  merkleRoot: text('merkle_root'),

  // Whether user is currently active
  isActive: boolean('is_active').notNull().default(true),

  // Login Streak (for 7-day bonus)
  streakCount: integer('streak_count').notNull().default(0),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
}, (table) => [
  uniqueIndex('users_nullifier_hash_idx').on(table.nullifierHash),
  index('users_wallet_address_idx').on(table.walletAddress),
]);

/**
 * Claim Transactions Table
 * Records every token distribution with timestamps
 * Used for enforcing 24-hour cooldown periods
 */
export const claimTransactions = pgTable('claim_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Reference to user
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Claim type (daily_bonus, game_reward, referral, etc.)
  claimType: varchar('claim_type', { length: 50 }).notNull(),

  // Amount of tokens distributed (in wei as string for precision)
  amount: text('amount').notNull(),

  // Token contract address
  tokenAddress: varchar('token_address', { length: 42 }).notNull(),

  // Transaction hash on World Chain
  txHash: varchar('tx_hash', { length: 66 }),

  // Transaction status
  status: varchar('status', { length: 20 }).notNull().default('pending'),

  // Error message if failed
  errorMessage: text('error_message'),

  // Block number when confirmed
  blockNumber: bigint('block_number', { mode: 'number' }),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at'),
}, (table) => [
  index('claim_transactions_user_id_idx').on(table.userId),
  index('claim_transactions_claim_type_idx').on(table.claimType),
  index('claim_transactions_created_at_idx').on(table.createdAt),
  index('claim_transactions_user_type_created_idx').on(table.userId, table.claimType, table.createdAt),
]);

/**
 * Game Scores Table
 * Stores validated game scores for leaderboard
 * Includes anti-cheat validation data
 */
export const gameScores = pgTable('game_scores', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Reference to user
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Game type (barn_game, harvest, etc.)
  gameType: varchar('game_type', { length: 50 }).notNull(),

  // Score value
  score: integer('score').notNull(),

  // Monthly profit for leaderboard (in game currency)
  monthlyProfit: bigint('monthly_profit', { mode: 'number' }).notNull().default(0),

  // Game session data for validation
  sessionId: uuid('session_id'),

  // Time taken to complete (in seconds) - for time-delta validation
  timeTaken: integer('time_taken'),

  // Game start timestamp - for anti-cheat
  gameStartedAt: timestamp('game_started_at'),

  // Validation metadata (JSON string)
  validationData: text('validation_data'),

  // Whether score passed validation
  isValidated: boolean('is_validated').notNull().default(false),

  // Period for leaderboard (e.g., '2025-01' for January 2025)
  leaderboardPeriod: varchar('leaderboard_period', { length: 7 }).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('game_scores_user_id_idx').on(table.userId),
  index('game_scores_leaderboard_period_idx').on(table.leaderboardPeriod),
  index('game_scores_score_idx').on(table.score),
  index('game_scores_monthly_profit_idx').on(table.monthlyProfit),
  index('game_scores_period_profit_idx').on(table.leaderboardPeriod, table.monthlyProfit),
]);

/**
 * Sessions Table
 * Manages user sessions with JWT tokens
 */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Reference to user
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Session token (hashed)
  tokenHash: text('token_hash').notNull(),

  // Wallet address used for this session
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),

  // Session expiration
  expiresAt: timestamp('expires_at').notNull(),

  // Whether session is active
  isActive: boolean('is_active').notNull().default(true),

  // Device/client info for security
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at').notNull().defaultNow(),
}, (table) => [
  index('sessions_user_id_idx').on(table.userId),
  index('sessions_token_hash_idx').on(table.tokenHash),
  index('sessions_expires_at_idx').on(table.expiresAt),
]);

/**
 * Daily Bonus Claims Table
 * Tracks daily bonus claims separately for easy 24h cooldown check
 */
export const dailyBonusClaims = pgTable('daily_bonus_claims', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Reference to user
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Claim date (YYYY-MM-DD format for easy daily lookup)
  claimDate: varchar('claim_date', { length: 10 }).notNull(),

  // Amount claimed
  amount: text('amount').notNull(),

  // Associated transaction
  transactionId: uuid('transaction_id').references(() => claimTransactions.id),

  // Timestamp
  claimedAt: timestamp('claimed_at').notNull().defaultNow(),
}, (table) => [
  index('daily_bonus_claims_user_id_idx').on(table.userId),
  uniqueIndex('daily_bonus_claims_user_date_idx').on(table.userId, table.claimDate),
]);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  claimTransactions: many(claimTransactions),
  gameScores: many(gameScores),
  sessions: many(sessions),
  dailyBonusClaims: many(dailyBonusClaims),
  barnGameAttempts: one(barnGameAttempts),
  barnGamePurchases: many(barnGamePurchases),
}));

export const claimTransactionsRelations = relations(claimTransactions, ({ one }) => ({
  user: one(users, {
    fields: [claimTransactions.userId],
    references: [users.id],
  }),
}));

export const gameScoresRelations = relations(gameScores, ({ one }) => ({
  user: one(users, {
    fields: [gameScores.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const dailyBonusClaimsRelations = relations(dailyBonusClaims, ({ one }) => ({
  user: one(users, {
    fields: [dailyBonusClaims.userId],
    references: [users.id],
  }),
  transaction: one(claimTransactions, {
    fields: [dailyBonusClaims.transactionId],
    references: [claimTransactions.id],
  }),
}));

/**
 * Barn Game Attempts Table
 * Tracks card matching game attempts and cooldowns
 * Supports instant refill via payment
 */
export const barnGameAttempts = pgTable('barn_game_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Reference to user
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Current attempts remaining (max 10)
  attemptsRemaining: integer('attempts_remaining').notNull().default(10),

  // When attempts were last used up (null if attempts available)
  cooldownStartedAt: timestamp('cooldown_started_at'),

  // When cooldown ends (24 hours after cooldown started)
  cooldownEndsAt: timestamp('cooldown_ends_at'),

  // Last game played date (YYYY-MM-DD format)
  lastPlayedDate: varchar('last_played_date', { length: 10 }),

  // Total coins won today
  totalCoinsWonToday: integer('total_coins_won_today').notNull().default(0),

  // Matches found today
  matchesFoundToday: integer('matches_found_today').notNull().default(0),

  // Whether user has active game session
  hasActiveGame: boolean('has_active_game').notNull().default(false),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('barn_game_attempts_user_id_idx').on(table.userId),
]);

/**
 * Barn Game Purchases Table
 * Records when users pay to refill attempts
 */
export const barnGamePurchases = pgTable('barn_game_purchases', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Reference to user
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Payment reference from World App
  paymentReference: varchar('payment_reference', { length: 100 }).notNull(),

  // Transaction ID from World App
  transactionId: varchar('transaction_id', { length: 100 }),

  // Amount paid (in WLD or USDC)
  amount: text('amount').notNull(),

  // Token symbol (WLD, USDC)
  tokenSymbol: varchar('token_symbol', { length: 10 }).notNull(),

  // Status of purchase
  status: varchar('status', { length: 20 }).notNull().default('pending'),

  // Attempts granted
  attemptsGranted: integer('attempts_granted').notNull().default(10),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at'),
}, (table) => [
  index('barn_game_purchases_user_id_idx').on(table.userId),
  index('barn_game_purchases_payment_reference_idx').on(table.paymentReference),
]);

/**
 * Payment References Table
 * Stores secure payment reference IDs generated server-side
 * Used for World App MiniKit payment verification
 */
export const paymentReferences = pgTable('payment_references', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Unique reference ID (32 hex chars)
  referenceId: varchar('reference_id', { length: 64 }).notNull(),

  // Reference to user
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Amount to be paid
  amount: text('amount').notNull(),

  // Token symbol (WLD, USDC)
  tokenSymbol: varchar('token_symbol', { length: 10 }).notNull(),

  // Item type being purchased
  itemType: varchar('item_type', { length: 50 }).notNull(),

  // Status of the payment reference
  status: varchar('status', { length: 20 }).notNull().default('pending'),

  // When this reference expires (5 minutes)
  expiresAt: timestamp('expires_at').notNull(),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('payment_references_reference_id_idx').on(table.referenceId),
  index('payment_references_user_id_idx').on(table.userId),
  index('payment_references_expires_at_idx').on(table.expiresAt),
]);

// Barn game relations
export const barnGameAttemptsRelations = relations(barnGameAttempts, ({ one }) => ({
  user: one(users, {
    fields: [barnGameAttempts.userId],
    references: [users.id],
  }),
}));

export const barnGamePurchasesRelations = relations(barnGamePurchases, ({ one }) => ({
  user: one(users, {
    fields: [barnGamePurchases.userId],
    references: [users.id],
  }),
}));

export const paymentReferencesRelations = relations(paymentReferences, ({ one }) => ({
  user: one(users, {
    fields: [paymentReferences.userId],
    references: [users.id],
  }),
}));

// Type exports for use in application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ClaimTransaction = typeof claimTransactions.$inferSelect;
export type NewClaimTransaction = typeof claimTransactions.$inferInsert;
export type GameScore = typeof gameScores.$inferSelect;
export type NewGameScore = typeof gameScores.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type DailyBonusClaim = typeof dailyBonusClaims.$inferSelect;
export type NewDailyBonusClaim = typeof dailyBonusClaims.$inferInsert;
export type BarnGameAttempt = typeof barnGameAttempts.$inferSelect;
export type NewBarnGameAttempt = typeof barnGameAttempts.$inferInsert;
export type BarnGamePurchase = typeof barnGamePurchases.$inferSelect;
export type NewBarnGamePurchase = typeof barnGamePurchases.$inferInsert;
export type PaymentReference = typeof paymentReferences.$inferSelect;
export type NewPaymentReference = typeof paymentReferences.$inferInsert;
