/**
 * Drizzle ORM Schema for Replit PostgreSQL
 * All database tables for the blooming-beginnings app
 *
 * Tables:
 * - users: User accounts and wallet data
 * - siwe_nonces: One-time nonces for SIWE authentication
 * - game_scores: Game scores and leaderboard data
 * - sessions: User session tracking
 * - barn_game_attempts: Lives system and game state
 * - barn_game_purchases: Play pass purchases
 * - payment_references: Payment tracking
 * - claim_transactions: Token claim transactions
 * - daily_bonus_claims: Daily bonus claim tracking
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// USERS TABLE
// ============================================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull().unique(),
  nullifierHash: varchar('nullifier_hash', { length: 255 }).notNull().unique(),
  verificationLevel: varchar('verification_level', { length: 50 }).default('wallet'),
  merkleRoot: varchar('merkle_root', { length: 255 }),
  isActive: boolean('is_active').default(true),
  dailyStreakCount: integer('daily_streak_count').default(0),
  lastDailyClaimDate: varchar('last_daily_claim_date', { length: 10 }), // YYYY-MM-DD
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('users_wallet_address_idx').on(table.walletAddress),
]);

// ============================================
// SIWE NONCES TABLE
// One-time use nonces for Sign In With Ethereum
// ============================================
export const siweNonces = pgTable('siwe_nonces', {
  nonce: varchar('nonce', { length: 64 }).primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('siwe_nonces_expires_at_idx').on(table.expiresAt),
]);

// ============================================
// GAME SCORES TABLE
// Game scores for leaderboard ranking
// ============================================
export const gameScores = pgTable('game_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gameType: varchar('game_type', { length: 50 }).notNull().default('card_match'),
  score: integer('score').notNull().default(0),
  monthlyProfit: integer('monthly_profit').notNull().default(0),
  leaderboardPeriod: varchar('leaderboard_period', { length: 7 }).notNull(), // YYYY-MM
  sessionId: varchar('session_id', { length: 64 }),
  timeTaken: integer('time_taken'), // seconds
  gameStartedAt: timestamp('game_started_at'),
  validationData: text('validation_data'), // JSON string
  isValidated: boolean('is_validated').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('game_scores_user_id_idx').on(table.userId),
  index('game_scores_period_idx').on(table.leaderboardPeriod),
  index('game_scores_user_period_idx').on(table.userId, table.leaderboardPeriod),
  uniqueIndex('game_scores_session_idx').on(table.userId, table.sessionId),
]);

// ============================================
// SESSIONS TABLE
// User session tracking
// ============================================
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  isActive: boolean('is_active').default(true),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  lastUsedAt: timestamp('last_used_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('sessions_user_id_idx').on(table.userId),
  index('sessions_token_hash_idx').on(table.tokenHash),
]);

// ============================================
// BARN GAME ATTEMPTS TABLE
// Lives system and game state tracking
//
// Lives System:
// - Default: 5 lives
// - Regeneration: 1 life every 6 hours
// - Max lives: 5
// ============================================
export const barnGameAttempts = pgTable('barn_game_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),

  // Lives System - CRITICAL
  lives: integer('lives').notNull().default(5), // 0-5 lives
  livesLastRegeneratedAt: timestamp('lives_last_regenerated_at').defaultNow(),

  // Legacy attempt tracking
  attemptsRemaining: integer('attempts_remaining').default(3),
  freeGameUsed: boolean('free_game_used').default(false),
  hasActiveGame: boolean('has_active_game').default(false),

  // Daily tracking
  lastPlayedDate: varchar('last_played_date', { length: 10 }), // YYYY-MM-DD
  totalCoinsWonToday: integer('total_coins_won_today').default(0),
  matchesFoundToday: integer('matches_found_today').default(0),

  // Cooldown system
  cooldownStartedAt: timestamp('cooldown_started_at'),
  cooldownEndsAt: timestamp('cooldown_ends_at'),

  // Play pass system
  playPassPurchasedAt: timestamp('play_pass_purchased_at'),
  playPassExpiresAt: timestamp('play_pass_expires_at'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('barn_game_attempts_user_id_idx').on(table.userId),
  index('barn_game_attempts_lives_regen_idx').on(table.livesLastRegeneratedAt),
]);

// ============================================
// BARN GAME PURCHASES TABLE
// Play pass and item purchases
// ============================================
export const barnGamePurchases = pgTable('barn_game_purchases', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  paymentReference: varchar('payment_reference', { length: 255 }).notNull(),
  transactionId: varchar('transaction_id', { length: 255 }),
  amount: numeric('amount', { precision: 18, scale: 8 }).notNull(),
  tokenSymbol: varchar('token_symbol', { length: 10 }).notNull().default('WLD'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, completed, failed
  attemptsGranted: integer('attempts_granted').default(0),
  playPassDurationMs: integer('play_pass_duration_ms'),
  confirmedAt: timestamp('confirmed_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('barn_game_purchases_user_id_idx').on(table.userId),
  index('barn_game_purchases_reference_idx').on(table.paymentReference),
]);

// ============================================
// PAYMENT REFERENCES TABLE
// Payment reference tracking
// ============================================
export const paymentReferences = pgTable('payment_references', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  referenceId: varchar('reference_id', { length: 255 }).notNull().unique(),
  itemType: varchar('item_type', { length: 50 }).notNull(), // play_pass, lives_pack, etc.
  amount: numeric('amount', { precision: 18, scale: 8 }).notNull(),
  tokenSymbol: varchar('token_symbol', { length: 10 }).notNull().default('WLD'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('payment_references_user_id_idx').on(table.userId),
  index('payment_references_reference_id_idx').on(table.referenceId),
]);

// ============================================
// CLAIM TRANSACTIONS TABLE
// Token claim transactions (daily bonus, game rewards)
// ============================================
export const claimTransactions = pgTable('claim_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  claimType: varchar('claim_type', { length: 50 }).notNull(), // daily_bonus, game_reward
  amount: numeric('amount', { precision: 36, scale: 18 }).notNull(), // wei amount
  tokenAddress: varchar('token_address', { length: 42 }).notNull(),
  txHash: varchar('tx_hash', { length: 66 }),
  blockNumber: integer('block_number'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  errorMessage: text('error_message'),
  confirmedAt: timestamp('confirmed_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('claim_transactions_user_id_idx').on(table.userId),
  index('claim_transactions_tx_hash_idx').on(table.txHash),
]);

// ============================================
// DAILY BONUS CLAIMS TABLE
// Track daily bonus claims per user per day
// ============================================
export const dailyBonusClaims = pgTable('daily_bonus_claims', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  claimDate: varchar('claim_date', { length: 10 }).notNull(), // YYYY-MM-DD
  amount: numeric('amount', { precision: 36, scale: 18 }).notNull(),
  transactionId: uuid('transaction_id').references(() => claimTransactions.id),
  claimedAt: timestamp('claimed_at').defaultNow(),
}, (table) => [
  index('daily_bonus_claims_user_id_idx').on(table.userId),
  uniqueIndex('daily_bonus_claims_user_date_idx').on(table.userId, table.claimDate),
]);

// ============================================
// RELATIONS
// ============================================
export const usersRelations = relations(users, ({ many, one }) => ({
  gameScores: many(gameScores),
  sessions: many(sessions),
  barnGameAttempts: one(barnGameAttempts),
  barnGamePurchases: many(barnGamePurchases),
  paymentReferences: many(paymentReferences),
  claimTransactions: many(claimTransactions),
  dailyBonusClaims: many(dailyBonusClaims),
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

export const claimTransactionsRelations = relations(claimTransactions, ({ one }) => ({
  user: one(users, {
    fields: [claimTransactions.userId],
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

// ============================================
// TYPE EXPORTS
// ============================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SiweNonce = typeof siweNonces.$inferSelect;
export type NewSiweNonce = typeof siweNonces.$inferInsert;
export type GameScore = typeof gameScores.$inferSelect;
export type NewGameScore = typeof gameScores.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type BarnGameAttempt = typeof barnGameAttempts.$inferSelect;
export type NewBarnGameAttempt = typeof barnGameAttempts.$inferInsert;
export type BarnGamePurchase = typeof barnGamePurchases.$inferSelect;
export type NewBarnGamePurchase = typeof barnGamePurchases.$inferInsert;
export type PaymentReference = typeof paymentReferences.$inferSelect;
export type NewPaymentReference = typeof paymentReferences.$inferInsert;
export type ClaimTransaction = typeof claimTransactions.$inferSelect;
export type NewClaimTransaction = typeof claimTransactions.$inferInsert;
export type DailyBonusClaim = typeof dailyBonusClaims.$inferSelect;
export type NewDailyBonusClaim = typeof dailyBonusClaims.$inferInsert;

// Table names constant for reference
export const TABLES = {
  USERS: 'users',
  SIWE_NONCES: 'siwe_nonces',
  GAME_SCORES: 'game_scores',
  SESSIONS: 'sessions',
  BARN_GAME_ATTEMPTS: 'barn_game_attempts',
  BARN_GAME_PURCHASES: 'barn_game_purchases',
  PAYMENT_REFERENCES: 'payment_references',
  CLAIM_TRANSACTIONS: 'claim_transactions',
  DAILY_BONUS_CLAIMS: 'daily_bonus_claims',
} as const;

// Helper function to get current leaderboard period (YYYY-MM)
export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
