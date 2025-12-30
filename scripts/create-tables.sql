-- =============================================
-- Blooming Beginnings - Database Tables
-- Run this in Vercel Postgres / Neon SQL Editor
-- =============================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nullifier_hash TEXT NOT NULL UNIQUE,
    wallet_address VARCHAR(42) NOT NULL,
    verification_level VARCHAR(20) NOT NULL DEFAULT 'orb',
    merkle_root TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS users_nullifier_hash_idx ON users(nullifier_hash);
CREATE INDEX IF NOT EXISTS users_wallet_address_idx ON users(wallet_address);

-- 2. Claim Transactions Table
CREATE TABLE IF NOT EXISTS claim_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    claim_type VARCHAR(50) NOT NULL,
    amount TEXT NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    tx_hash VARCHAR(66),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    block_number BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS claim_transactions_user_id_idx ON claim_transactions(user_id);
CREATE INDEX IF NOT EXISTS claim_transactions_claim_type_idx ON claim_transactions(claim_type);
CREATE INDEX IF NOT EXISTS claim_transactions_created_at_idx ON claim_transactions(created_at);

-- 3. Game Scores Table
CREATE TABLE IF NOT EXISTS game_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL,
    monthly_profit BIGINT NOT NULL DEFAULT 0,
    session_id UUID,
    time_taken INTEGER,
    game_started_at TIMESTAMP,
    validation_data TEXT,
    is_validated BOOLEAN NOT NULL DEFAULT false,
    leaderboard_period VARCHAR(7) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_scores_user_id_idx ON game_scores(user_id);
CREATE INDEX IF NOT EXISTS game_scores_leaderboard_period_idx ON game_scores(leaderboard_period);
CREATE INDEX IF NOT EXISTS game_scores_score_idx ON game_scores(score);
CREATE INDEX IF NOT EXISTS game_scores_monthly_profit_idx ON game_scores(monthly_profit);

-- 4. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

-- 5. Daily Bonus Claims Table
CREATE TABLE IF NOT EXISTS daily_bonus_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    claim_date VARCHAR(10) NOT NULL,
    amount TEXT NOT NULL,
    transaction_id UUID REFERENCES claim_transactions(id),
    claimed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS daily_bonus_claims_user_id_idx ON daily_bonus_claims(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS daily_bonus_claims_user_date_idx ON daily_bonus_claims(user_id, claim_date);

-- Done!
SELECT 'All tables created successfully!' as result;
