-- ============================================================
-- Phase: Two-Factor Authentication (2FA) Schema
-- ============================================================
-- Adds columns to the profiles table for custom TOTP 2FA.
-- Includes fields for encrypted secret, recovery codes,
-- rate limiting, and lockout.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS two_factor_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS recovery_codes_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS two_factor_enabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS otp_failed_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_locked_until TIMESTAMPTZ;

-- Reset function for rate limiting (can be used by admin or cron)
CREATE OR REPLACE FUNCTION reset_otp_lockouts()
RETURNS void LANGUAGE sql AS $$
  UPDATE public.profiles
  SET otp_failed_attempts = 0,
      otp_locked_until = NULL
  WHERE otp_locked_until < now();
$$;
