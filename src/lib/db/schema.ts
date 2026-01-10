/**
 * Database Schema Types - Re-exports from Supabase
 * For Lovable compatibility - uses Supabase types instead of Drizzle
 *
 * This file provides type exports for database tables
 * All database operations should use the Supabase client directly
 */

// Re-export types from Supabase
export type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Re-export from frontend Supabase services
export type {
  User,
  GameScore,
  BarnGameAttempt,
  LeaderboardEntry,
} from '@/lib/services/supabase';

export {
  getCurrentPeriod,
  getUserByWallet,
  getUserById,
  submitGameScore,
  getUserGameStats,
  getUserRecentGames,
  getLeaderboard,
  getUserRank,
  getBarnGameStatus,
  upsertBarnGameStatus,
  canClaimDailyBonus,
  updateDailyBonusClaim,
  supabase,
} from '@/lib/services/supabase';

// Table names for reference
export const TABLES = {
  USERS: 'users',
  SIWE_NONCES: 'siwe_nonces',
  GAME_SCORES: 'game_scores',
  SESSIONS: 'sessions',
  BARN_GAME_ATTEMPTS: 'barn_game_attempts',
  BARN_GAME_PURCHASES: 'barn_game_purchases',
  CLAIM_TRANSACTIONS: 'claim_transactions',
  DAILY_BONUS_CLAIMS: 'daily_bonus_claims',
  PAYMENT_REFERENCES: 'payment_references',
} as const;
