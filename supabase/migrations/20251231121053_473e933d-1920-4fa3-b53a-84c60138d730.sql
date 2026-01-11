-- Users table for World ID authentication
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nullifier_hash TEXT NOT NULL UNIQUE,
  wallet_address VARCHAR(42) NOT NULL,
  verification_level VARCHAR(20) NOT NULL DEFAULT 'orb',
  merkle_root TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Game scores table
CREATE TABLE public.game_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  game_type VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL,
  monthly_profit BIGINT NOT NULL DEFAULT 0,
  session_id UUID,
  time_taken INTEGER,
  game_started_at TIMESTAMP WITH TIME ZONE,
  validation_data TEXT,
  is_validated BOOLEAN NOT NULL DEFAULT false,
  leaderboard_period VARCHAR(7) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Claim transactions table
CREATE TABLE public.claim_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  claim_type VARCHAR(50) NOT NULL,
  amount TEXT NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  tx_hash VARCHAR(66),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  block_number BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Daily bonus claims table
CREATE TABLE public.daily_bonus_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  claim_date VARCHAR(10) NOT NULL,
  amount TEXT NOT NULL,
  transaction_id UUID REFERENCES public.claim_transactions(id),
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, claim_date)
);

-- Barn game attempts table
CREATE TABLE public.barn_game_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  attempts_remaining INTEGER NOT NULL DEFAULT 10,
  cooldown_started_at TIMESTAMP WITH TIME ZONE,
  cooldown_ends_at TIMESTAMP WITH TIME ZONE,
  last_played_date VARCHAR(10),
  total_coins_won_today INTEGER NOT NULL DEFAULT 0,
  matches_found_today INTEGER NOT NULL DEFAULT 0,
  has_active_game BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Barn game purchases table
CREATE TABLE public.barn_game_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  payment_reference VARCHAR(100) NOT NULL,
  transaction_id VARCHAR(100),
  amount TEXT NOT NULL,
  token_symbol VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts_granted INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Payment references table
CREATE TABLE public.payment_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id VARCHAR(64) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount TEXT NOT NULL,
  token_symbol VARCHAR(10) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_bonus_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barn_game_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barn_game_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_references ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX users_wallet_address_idx ON public.users(wallet_address);
CREATE INDEX sessions_user_id_idx ON public.sessions(user_id);
CREATE INDEX sessions_token_hash_idx ON public.sessions(token_hash);
CREATE INDEX sessions_expires_at_idx ON public.sessions(expires_at);
CREATE INDEX game_scores_user_id_idx ON public.game_scores(user_id);
CREATE INDEX game_scores_leaderboard_period_idx ON public.game_scores(leaderboard_period);
CREATE INDEX game_scores_monthly_profit_idx ON public.game_scores(monthly_profit);
CREATE INDEX claim_transactions_user_id_idx ON public.claim_transactions(user_id);
CREATE INDEX claim_transactions_created_at_idx ON public.claim_transactions(created_at);
CREATE INDEX daily_bonus_claims_user_id_idx ON public.daily_bonus_claims(user_id);
CREATE INDEX barn_game_purchases_user_id_idx ON public.barn_game_purchases(user_id);
CREATE INDEX barn_game_purchases_payment_reference_idx ON public.barn_game_purchases(payment_reference);
CREATE INDEX payment_references_user_id_idx ON public.payment_references(user_id);
CREATE INDEX payment_references_expires_at_idx ON public.payment_references(expires_at);

-- RLS Policies for users table (allow backend service role full access)
CREATE POLICY "Service role can manage users"
ON public.users FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for sessions
CREATE POLICY "Service role can manage sessions"
ON public.sessions FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for game_scores
CREATE POLICY "Anyone can view game scores"
ON public.game_scores FOR SELECT
USING (true);

CREATE POLICY "Service role can insert game scores"
ON public.game_scores FOR INSERT
WITH CHECK (true);

-- RLS Policies for claim_transactions
CREATE POLICY "Service role can manage claim transactions"
ON public.claim_transactions FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for daily_bonus_claims
CREATE POLICY "Service role can manage daily bonus claims"
ON public.daily_bonus_claims FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for barn_game_attempts
CREATE POLICY "Service role can manage barn game attempts"
ON public.barn_game_attempts FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for barn_game_purchases
CREATE POLICY "Service role can manage barn game purchases"
ON public.barn_game_purchases FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for payment_references
CREATE POLICY "Service role can manage payment references"
ON public.payment_references FOR ALL
USING (true)
WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_barn_game_attempts_updated_at
BEFORE UPDATE ON public.barn_game_attempts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();