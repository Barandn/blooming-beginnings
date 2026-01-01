-- Fix: Sessions table RLS policy is not working correctly
-- The original "Service role can manage sessions" policy uses USING(true) without
-- targeting a specific role, which allows ALL roles (including anon) to access data.
-- This makes the "Deny public access to sessions" policy ineffective because
-- PERMISSIVE policies are combined with OR logic in PostgreSQL RLS.
--
-- The fix: Drop the overly permissive policy. The service_role key bypasses RLS
-- entirely, so backend operations via Edge Functions will continue to work.
-- Only the anon deny policy will remain, properly blocking public access.

-- Drop the overly permissive policy that allows anyone to access sessions
DROP POLICY IF EXISTS "Service role can manage sessions" ON public.sessions;

-- The existing "Deny public access to sessions" policy (from migration 20260101072904)
-- will now properly block all anonymous/public access since there's no longer
-- a conflicting PERMISSIVE policy allowing access.

-- Note: service_role bypasses RLS entirely, so Edge Functions using SUPABASE_SERVICE_ROLE_KEY
-- will continue to have full access to manage sessions.
