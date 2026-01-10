/**
 * Database Schema - Re-exports from Supabase types
 * For Lovable compatibility
 *
 * This file maintains backward compatibility while using Supabase types
 */

// Re-export types from the main db index
export type {
  User,
  SiweNonce,
  GameScore,
  Session,
  BarnGameAttempt,
  BarnGamePurchase,
  ClaimTransaction,
  DailyBonusClaim,
  PaymentReference,
} from './index';

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

// Re-export getCurrentPeriod for convenience
export { getCurrentPeriod } from './index';
