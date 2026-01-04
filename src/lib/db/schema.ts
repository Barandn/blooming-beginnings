/**
 * Database Schema for World App Mini-App (Frontend Reference)
 * This mirrors the actual database structure for type safety
 *
 * Tables:
 * 1. users - Identity mapping (nullifier_hash → wallet_address)
 * 2. claim_transactions - Token distribution log
 * 3. game_scores - Validated game scores for leaderboard
 * 4. sessions - User session management
 * 5. siwe_nonces - SIWE authentication nonces
 * 6. barn_game_attempts - Barn game play tracking
 * 7. barn_game_purchases - Barn game purchases
 * 8. payment_references - Payment reference IDs
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
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  nullifierHash: text('nullifier_hash').notNull().unique(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  verificationLevel: varchar('verification_level', { length: 20 }).notNull().default('orb'),
  merkleRoot: text('merkle_root'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
}, (table) => [
  uniqueIndex('users_nullifier_hash_idx').on(table.nullifierHash),
  index('users_wallet_address_idx').on(table.walletAddress),
]);

/**
 * SIWE Nonces Table
 */
export const siweNonces = pgTable('siwe_nonces', {
  nonce: text('nonce').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Claim Transactions Table
 */
export const claimTransactions = pgTable('claim_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  claimType: varchar('claim_type', { length: 50 }).notNull(),
  amount: text('amount').notNull(),
  tokenAddress: varchar('token_address', { length: 42 }).notNull(),
  txHash: varchar('tx_hash', { length: 66 }),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  errorMessage: text('error_message'),
  blockNumber: bigint('block_number', { mode: 'number' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at'),
}, (table) => [
  index('claim_transactions_user_id_idx').on(table.userId),
  index('claim_transactions_claim_type_idx').on(table.claimType),
  index('claim_transactions_created_at_idx').on(table.createdAt),
]);

/**
 * Game Scores Table
 */
export const gameScores = pgTable('game_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gameType: varchar('game_type', { length: 50 }).notNull(),
  score: integer('score').notNull(),
  monthlyProfit: bigint('monthly_profit', { mode: 'number' }).notNull().default(0),
  sessionId: uuid('session_id'),
  timeTaken: integer('time_taken'),
  gameStartedAt: timestamp('game_started_at'),
  validationData: text('validation_data'),
  isValidated: boolean('is_validated').notNull().default(false),
  leaderboardPeriod: varchar('leaderboard_period', { length: 7 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('game_scores_user_id_idx').on(table.userId),
  index('game_scores_leaderboard_period_idx').on(table.leaderboardPeriod),
]);

/**
 * Sessions Table
 */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at').notNull().defaultNow(),
}, (table) => [
  index('sessions_user_id_idx').on(table.userId),
  index('sessions_token_hash_idx').on(table.tokenHash),
]);

/**
 * Daily Bonus Claims Table
 */
export const dailyBonusClaims = pgTable('daily_bonus_claims', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  claimDate: varchar('claim_date', { length: 10 }).notNull(),
  amount: text('amount').notNull(),
  transactionId: uuid('transaction_id').references(() => claimTransactions.id),
  claimedAt: timestamp('claimed_at').notNull().defaultNow(),
}, (table) => [
  index('daily_bonus_claims_user_id_idx').on(table.userId),
  uniqueIndex('daily_bonus_claims_user_date_idx').on(table.userId, table.claimDate),
]);

/**
 * Barn Game Attempts Table
 * Uses attempts-based system (10 attempts per purchase)
 */
export const barnGameAttempts = pgTable('barn_game_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  attemptsRemaining: integer('attempts_remaining').notNull().default(10),
  cooldownStartedAt: timestamp('cooldown_started_at'),
  cooldownEndsAt: timestamp('cooldown_ends_at'),
  lastPlayedDate: varchar('last_played_date', { length: 10 }),
  totalCoinsWonToday: integer('total_coins_won_today').notNull().default(0),
  matchesFoundToday: integer('matches_found_today').notNull().default(0),
  hasActiveGame: boolean('has_active_game').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('barn_game_attempts_user_id_idx').on(table.userId),
]);

/**
 * Barn Game Purchases Table
 */
export const barnGamePurchases = pgTable('barn_game_purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  paymentReference: varchar('payment_reference', { length: 100 }).notNull(),
  transactionId: varchar('transaction_id', { length: 100 }),
  amount: text('amount').notNull(),
  tokenSymbol: varchar('token_symbol', { length: 10 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  attemptsGranted: integer('attempts_granted').notNull().default(10),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at'),
}, (table) => [
  index('barn_game_purchases_user_id_idx').on(table.userId),
  index('barn_game_purchases_payment_reference_idx').on(table.paymentReference),
]);

/**
 * Payment References Table
 */
export const paymentReferences = pgTable('payment_references', {
  id: uuid('id').primaryKey().defaultRandom(),
  referenceId: varchar('reference_id', { length: 64 }).notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: text('amount').notNull(),
  tokenSymbol: varchar('token_symbol', { length: 10 }).notNull(),
  itemType: varchar('item_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('payment_references_reference_id_idx').on(table.referenceId),
  index('payment_references_user_id_idx').on(table.userId),
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

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SiweNonce = typeof siweNonces.$inferSelect;
export type NewSiweNonce = typeof siweNonces.$inferInsert;
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
