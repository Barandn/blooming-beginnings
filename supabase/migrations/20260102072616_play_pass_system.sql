-- Migration: Play Pass System
-- Description: Convert from attempts-based system to Play Pass system
-- - 1 WLD = 1 hour unlimited play
-- - Or wait 12 hours cooldown for 1 free game

-- =============================================
-- 1. Update barn_game_attempts table
-- =============================================

-- Add new columns for Play Pass system
ALTER TABLE barn_game_attempts
ADD COLUMN IF NOT EXISTS play_pass_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS play_pass_purchased_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS free_game_used BOOLEAN NOT NULL DEFAULT false;

-- Remove old columns (attempts_remaining, cooldown_started_at)
ALTER TABLE barn_game_attempts
DROP COLUMN IF EXISTS attempts_remaining,
DROP COLUMN IF EXISTS cooldown_started_at;

-- =============================================
-- 2. Update barn_game_purchases table
-- =============================================

-- Add new column for Play Pass duration
ALTER TABLE barn_game_purchases
ADD COLUMN IF NOT EXISTS play_pass_duration_ms BIGINT NOT NULL DEFAULT 3600000;

-- Remove old column (attempts_granted)
ALTER TABLE barn_game_purchases
DROP COLUMN IF EXISTS attempts_granted;

-- =============================================
-- 3. Add comments for documentation
-- =============================================

COMMENT ON COLUMN barn_game_attempts.play_pass_expires_at IS 'When the current Play Pass expires (1 hour after purchase)';
COMMENT ON COLUMN barn_game_attempts.play_pass_purchased_at IS 'When the Play Pass was purchased';
COMMENT ON COLUMN barn_game_attempts.free_game_used IS 'Whether the free game has been used in the current cooldown cycle';
COMMENT ON COLUMN barn_game_attempts.cooldown_ends_at IS 'When the 12-hour cooldown ends (after free game used)';

COMMENT ON COLUMN barn_game_purchases.play_pass_duration_ms IS 'Duration of Play Pass granted in milliseconds (default: 1 hour = 3600000)';
