-- Add streak tracking to users table for daily bonus system
-- This allows tracking user's consecutive login streak in DB

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS daily_streak_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_daily_claim_date VARCHAR(10);

-- Add index for faster streak queries
CREATE INDEX IF NOT EXISTS users_daily_claim_date_idx ON public.users (last_daily_claim_date);