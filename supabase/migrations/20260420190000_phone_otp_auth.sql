-- ─────────────────────────────────────────────────────────────────────────────
-- WhatsApp OTP Authentication Tables
-- ─────────────────────────────────────────────────────────────────────────────

-- Stores short-lived OTP sessions (hashed, not raw OTP)
CREATE TABLE IF NOT EXISTS public.phone_otp_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT        NOT NULL,
  otp_hash    TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  verified    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_phone_exp
  ON public.phone_otp_sessions (phone, expires_at DESC);

-- Only accessible by service role (Edge Functions). No public RLS policies.
ALTER TABLE public.phone_otp_sessions ENABLE ROW LEVEL SECURITY;

-- Maps phone numbers to Supabase user IDs for fast lookup on repeat logins
CREATE TABLE IF NOT EXISTS public.phone_auth_users (
  phone       TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only accessible by service role (Edge Functions). No public RLS policies.
ALTER TABLE public.phone_auth_users ENABLE ROW LEVEL SECURITY;
