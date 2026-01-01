-- Persistent SIWE nonce store (fixes multi-instance edge runtime issues)
CREATE TABLE IF NOT EXISTS public.siwe_nonces (
  nonce TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_siwe_nonces_expires_at ON public.siwe_nonces (expires_at);
CREATE INDEX IF NOT EXISTS idx_siwe_nonces_consumed_at ON public.siwe_nonces (consumed_at);

ALTER TABLE public.siwe_nonces ENABLE ROW LEVEL SECURITY;

-- No client should ever need direct access; nonce flow is handled via backend function.
CREATE POLICY "No direct access to siwe nonces"
ON public.siwe_nonces
FOR ALL
USING (false)
WITH CHECK (false);
