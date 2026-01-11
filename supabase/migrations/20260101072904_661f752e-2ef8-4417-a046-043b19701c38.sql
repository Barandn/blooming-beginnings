-- Fix: Add proper RLS policies for sessions table to prevent unauthorized access
-- Currently only has a RESTRICTIVE service role policy

-- Add policy to deny all public access (anon users)
CREATE POLICY "Deny public access to sessions"
ON public.sessions
FOR ALL
TO anon
USING (false);

-- Note: The existing service role policy allows backend to manage sessions
-- This is the correct pattern since sessions are managed by edge functions
-- and users should not directly query/modify their sessions from client