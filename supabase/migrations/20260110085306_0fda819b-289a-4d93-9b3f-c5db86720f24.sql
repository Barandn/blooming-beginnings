-- First drop all existing tables and their dependencies
DROP TABLE IF EXISTS public.daily_bonus_claims CASCADE;
DROP TABLE IF EXISTS public.claim_transactions CASCADE;
DROP TABLE IF EXISTS public.barn_game_purchases CASCADE;
DROP TABLE IF EXISTS public.barn_game_attempts CASCADE;
DROP TABLE IF EXISTS public.payment_references CASCADE;
DROP TABLE IF EXISTS public.game_scores CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.siwe_nonces CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop existing trigger function if exists
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- ============================================
-- 1. USERS TABLE - Core user data
-- ============================================
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL UNIQUE,
  nullifier_hash TEXT NOT NULL UNIQUE,
  verification_level VARCHAR(20) NOT NULL DEFAULT 'wallet',
  merkle_root TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  daily_streak_count INTEGER NOT NULL DEFAULT 0,
  last_daily_claim_date VARCHAR(10),
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for wallet lookups
CREATE INDEX idx_users_wallet_address ON public.users(wallet_address);

-- ============================================
-- 2. SIWE_NONCES TABLE - Sign-In With Ethereum nonces
-- ============================================
CREATE TABLE public.siwe_nonces (
  nonce TEXT NOT NULL PRIMARY KEY,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for cleanup queries
CREATE INDEX idx_siwe_nonces_expires_at ON public.siwe_nonces(expires_at);

-- ============================================
-- 3. SESSIONS TABLE - User sessions
-- ============================================
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  wallet_address VARCHAR(42) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ip_address VARCHAR(45),
  user_agent TEXT,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for session lookups
CREATE INDEX idx_sessions_token_hash ON public.sessions(token_hash);
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at);

-- ============================================
-- 4. GAME_SCORES TABLE - Game score records
-- ============================================
CREATE TABLE public.game_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_type VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL,
  monthly_profit BIGINT NOT NULL DEFAULT 0,
  leaderboard_period VARCHAR(7) NOT NULL, -- YYYY-MM format
  session_id UUID,
  time_taken INTEGER, -- seconds
  game_started_at TIMESTAMP WITH TIME ZONE,
  validation_data TEXT,
  is_validated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for leaderboard queries
CREATE INDEX idx_game_scores_user_id ON public.game_scores(user_id);
CREATE INDEX idx_game_scores_period ON public.game_scores(leaderboard_period);
CREATE INDEX idx_game_scores_monthly_profit ON public.game_scores(monthly_profit DESC);
CREATE INDEX idx_game_scores_leaderboard ON public.game_scores(leaderboard_period, monthly_profit DESC, is_validated);

-- ============================================
-- 5. BARN_GAME_ATTEMPTS TABLE - Barn game state
-- ============================================
CREATE TABLE public.barn_game_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  attempts_remaining INTEGER NOT NULL DEFAULT 10,
  has_active_game BOOLEAN NOT NULL DEFAULT false,
  free_game_used BOOLEAN NOT NULL DEFAULT false,
  cooldown_started_at TIMESTAMP WITH TIME ZONE,
  cooldown_ends_at TIMESTAMP WITH TIME ZONE,
  play_pass_purchased_at TIMESTAMP WITH TIME ZONE,
  play_pass_expires_at TIMESTAMP WITH TIME ZONE,
  last_played_date VARCHAR(10),
  total_coins_won_today INTEGER NOT NULL DEFAULT 0,
  matches_found_today INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for user lookups
CREATE INDEX idx_barn_game_attempts_user_id ON public.barn_game_attempts(user_id);

-- ============================================
-- 6. BARN_GAME_PURCHASES TABLE - Play pass purchases
-- ============================================
CREATE TABLE public.barn_game_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  payment_reference VARCHAR(64) NOT NULL,
  transaction_id VARCHAR(66),
  amount TEXT NOT NULL,
  token_symbol VARCHAR(10) NOT NULL,
  attempts_granted INTEGER NOT NULL DEFAULT 10,
  play_pass_duration_ms BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for purchase lookups
CREATE INDEX idx_barn_game_purchases_user_id ON public.barn_game_purchases(user_id);
CREATE INDEX idx_barn_game_purchases_reference ON public.barn_game_purchases(payment_reference);

-- ============================================
-- 7. PAYMENT_REFERENCES TABLE - Payment tracking
-- ============================================
CREATE TABLE public.payment_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reference_id VARCHAR(64) NOT NULL UNIQUE,
  amount TEXT NOT NULL,
  token_symbol VARCHAR(10) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for payment lookups
CREATE INDEX idx_payment_references_user_id ON public.payment_references(user_id);
CREATE INDEX idx_payment_references_reference_id ON public.payment_references(reference_id);
CREATE INDEX idx_payment_references_expires_at ON public.payment_references(expires_at);

-- ============================================
-- 8. CLAIM_TRANSACTIONS TABLE - Token claims
-- ============================================
CREATE TABLE public.claim_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  claim_type VARCHAR(20) NOT NULL,
  amount TEXT NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  tx_hash VARCHAR(66),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  block_number BIGINT,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for claim lookups
CREATE INDEX idx_claim_transactions_user_id ON public.claim_transactions(user_id);
CREATE INDEX idx_claim_transactions_status ON public.claim_transactions(status);
CREATE INDEX idx_claim_transactions_tx_hash ON public.claim_transactions(tx_hash);

-- ============================================
-- 9. DAILY_BONUS_CLAIMS TABLE - Daily bonus tracking
-- ============================================
CREATE TABLE public.daily_bonus_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  claim_date VARCHAR(10) NOT NULL,
  amount TEXT NOT NULL,
  transaction_id UUID REFERENCES public.claim_transactions(id),
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, claim_date)
);

-- Index for daily bonus lookups
CREATE INDEX idx_daily_bonus_claims_user_date ON public.daily_bonus_claims(user_id, claim_date);

-- ============================================
-- TRIGGER FUNCTION - Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_barn_game_attempts_updated_at
  BEFORE UPDATE ON public.barn_game_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siwe_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barn_game_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barn_game_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_bonus_claims ENABLE ROW LEVEL SECURITY;

-- USERS: Service role only (no direct public access)
CREATE POLICY "Service role can manage users"
  ON public.users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- SIWE_NONCES: No public access (backend only)
CREATE POLICY "No direct access to siwe nonces"
  ON public.siwe_nonces FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Service role can manage siwe nonces"
  ON public.siwe_nonces FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- SESSIONS: No public access (backend only)
CREATE POLICY "Deny public access to sessions"
  ON public.sessions FOR ALL
  TO anon, authenticated
  USING (false);

CREATE POLICY "Service role can manage sessions"
  ON public.sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- GAME_SCORES: Anyone can view, service role can insert
CREATE POLICY "Anyone can view game scores"
  ON public.game_scores FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can insert game scores"
  ON public.game_scores FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update game scores"
  ON public.game_scores FOR UPDATE
  TO service_role
  USING (true);

-- BARN_GAME_ATTEMPTS: Service role only
CREATE POLICY "Service role can manage barn game attempts"
  ON public.barn_game_attempts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- BARN_GAME_PURCHASES: Service role only
CREATE POLICY "Service role can manage barn game purchases"
  ON public.barn_game_purchases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- PAYMENT_REFERENCES: Service role only
CREATE POLICY "Service role can manage payment references"
  ON public.payment_references FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- CLAIM_TRANSACTIONS: Service role only
CREATE POLICY "Service role can manage claim transactions"
  ON public.claim_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- DAILY_BONUS_CLAIMS: Service role only
CREATE POLICY "Service role can manage daily bonus claims"
  ON public.daily_bonus_claims FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);