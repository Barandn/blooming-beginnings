-- Fix: Secure user data tables to prevent unauthorized public access
-- The users table contains sensitive data (wallet addresses, nullifier hashes, activity data)
-- that could be exploited for phishing, user tracking, or deanonymization attacks
-- Other tables contain sensitive transaction and payment data that should also be protected

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Drop the existing overly permissive policy that allows anyone to read all user data
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;

-- Deny all access to anonymous users
-- This prevents public scraping of user data via the anon key
CREATE POLICY "Deny public access to users"
ON public.users
FOR ALL
TO anon
USING (false);

-- ============================================================================
-- CLAIM TRANSACTIONS TABLE
-- ============================================================================
-- Contains sensitive transaction data per user
DROP POLICY IF EXISTS "Service role can manage claim transactions" ON public.claim_transactions;

CREATE POLICY "Deny public access to claim transactions"
ON public.claim_transactions
FOR ALL
TO anon
USING (false);

-- ============================================================================
-- DAILY BONUS CLAIMS TABLE
-- ============================================================================
-- Contains user claim activity data
DROP POLICY IF EXISTS "Service role can manage daily bonus claims" ON public.daily_bonus_claims;

CREATE POLICY "Deny public access to daily bonus claims"
ON public.daily_bonus_claims
FOR ALL
TO anon
USING (false);

-- ============================================================================
-- BARN GAME ATTEMPTS TABLE
-- ============================================================================
-- Contains user game state data
DROP POLICY IF EXISTS "Service role can manage barn game attempts" ON public.barn_game_attempts;

CREATE POLICY "Deny public access to barn game attempts"
ON public.barn_game_attempts
FOR ALL
TO anon
USING (false);

-- ============================================================================
-- BARN GAME PURCHASES TABLE
-- ============================================================================
-- Contains sensitive payment/purchase data
DROP POLICY IF EXISTS "Service role can manage barn game purchases" ON public.barn_game_purchases;

CREATE POLICY "Deny public access to barn game purchases"
ON public.barn_game_purchases
FOR ALL
TO anon
USING (false);

-- ============================================================================
-- PAYMENT REFERENCES TABLE
-- ============================================================================
-- Contains sensitive payment reference data
DROP POLICY IF EXISTS "Service role can manage payment references" ON public.payment_references;

CREATE POLICY "Deny public access to payment references"
ON public.payment_references
FOR ALL
TO anon
USING (false);

-- ============================================================================
-- NOTE: The following remain unchanged:
-- - sessions: Already secured in migration 20260101072904
-- - game_scores: Intentionally public for leaderboard functionality
-- - siwe_nonces: Already secured in migration 20260101074906
-- ============================================================================

-- Note: The service_role key (used by Edge Functions and backend) bypasses RLS entirely
-- so backend operations will continue to work normally.
-- All user data access is now properly gated through authenticated Edge Functions
-- that verify session tokens before returning user-specific data.
