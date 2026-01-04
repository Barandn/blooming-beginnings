-- Migration: Add Play Pass columns to barn_game_attempts and barn_game_purchases tables
-- This fixes the "string did not match" error in leaderboard and kickoff functionality

-- Add missing columns to barn_game_attempts table
ALTER TABLE barn_game_attempts
ADD COLUMN IF NOT EXISTS free_game_used BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE barn_game_attempts
ADD COLUMN IF NOT EXISTS play_pass_expires_at TIMESTAMP;

ALTER TABLE barn_game_attempts
ADD COLUMN IF NOT EXISTS play_pass_purchased_at TIMESTAMP;

-- Add missing column to barn_game_purchases table
ALTER TABLE barn_game_purchases
ADD COLUMN IF NOT EXISTS play_pass_duration_ms BIGINT;

-- Update comment for documentation
COMMENT ON COLUMN barn_game_attempts.free_game_used IS 'Whether free game has been used (resets after cooldown expires)';
COMMENT ON COLUMN barn_game_attempts.play_pass_expires_at IS 'Play Pass expiration timestamp (1 hour after purchase)';
COMMENT ON COLUMN barn_game_attempts.play_pass_purchased_at IS 'When Play Pass was purchased';
COMMENT ON COLUMN barn_game_purchases.play_pass_duration_ms IS 'Play Pass duration in milliseconds (1 hour = 3600000ms)';
