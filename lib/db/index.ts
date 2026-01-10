/**
 * Database Connection for Supabase
 * Backend server-side Supabase client with service role key
 *
 * For Lovable compatibility - uses Supabase instead of Neon/Drizzle
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!SUPABASE_URL) {
  console.warn('SUPABASE_URL is not set');
}

// Create Supabase client for server-side operations
// Uses service role key for full database access (backend only)
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Type definitions matching Supabase schema
export interface User {
  id: string;
  nullifier_hash: string;
  wallet_address: string;
  verification_level: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
  daily_streak_count: number;
  last_daily_claim_date: string | null;
  merkle_root: string | null;
}

export interface SiweNonce {
  nonce: string;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

export interface GameScore {
  id: string;
  user_id: string;
  game_type: string;
  score: number;
  monthly_profit: number;
  leaderboard_period: string;
  session_id: string | null;
  time_taken: number | null;
  game_started_at: string | null;
  is_validated: boolean;
  validation_data: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  wallet_address: string;
  token_hash: string;
  expires_at: string;
  last_used_at: string;
  is_active: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface BarnGameAttempt {
  id: string;
  user_id: string;
  attempts_remaining: number;
  free_game_used: boolean;
  has_active_game: boolean;
  last_played_date: string | null;
  total_coins_won_today: number;
  matches_found_today: number;
  cooldown_started_at: string | null;
  cooldown_ends_at: string | null;
  play_pass_purchased_at: string | null;
  play_pass_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BarnGamePurchase {
  id: string;
  user_id: string;
  payment_reference: string;
  transaction_id: string | null;
  amount: string;
  token_symbol: string;
  status: string;
  attempts_granted: number;
  play_pass_duration_ms: number | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface ClaimTransaction {
  id: string;
  user_id: string;
  claim_type: string;
  amount: string;
  token_address: string;
  tx_hash: string | null;
  block_number: number | null;
  status: string;
  error_message: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface DailyBonusClaim {
  id: string;
  user_id: string;
  claim_date: string;
  amount: string;
  transaction_id: string | null;
  claimed_at: string;
}

export interface PaymentReference {
  id: string;
  user_id: string;
  reference_id: string;
  item_type: string;
  amount: string;
  token_symbol: string;
  status: string;
  expires_at: string;
  created_at: string;
}

// Helper function to get current leaderboard period (YYYY-MM)
export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Re-export supabase for convenience
export default supabase;
