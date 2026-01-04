-- Add new columns to barn_game_attempts
ALTER TABLE barn_game_attempts
ADD COLUMN IF NOT EXISTS free_game_used BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE barn_game_attempts
ADD COLUMN IF NOT EXISTS play_pass_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE barn_game_attempts
ADD COLUMN IF NOT EXISTS play_pass_purchased_at TIMESTAMP WITH TIME ZONE;

-- Add new column to barn_game_purchases
ALTER TABLE barn_game_purchases
ADD COLUMN IF NOT EXISTS play_pass_duration_ms BIGINT;