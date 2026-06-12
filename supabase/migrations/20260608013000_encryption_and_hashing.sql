-- ============================================================
-- Phase 5 & 6: Field-Level Encryption Schema + Hash Columns
-- ============================================================
-- Encryption is performed client-side (or in edge functions) using
-- AES-256-GCM. The ciphertext is stored with a "gcm_" prefix.
-- Hash columns (SHA-256) are used for lookups without decryption.
-- ============================================================

-- ─── Encrypted fields on profiles ────────────────────────────
ALTER TABLE public.profiles
  -- Encrypted storage columns
  ADD COLUMN IF NOT EXISTS phone_encrypted    text,
  ADD COLUMN IF NOT EXISTS email_encrypted    text,
  -- Hash columns for search/uniqueness
  ADD COLUMN IF NOT EXISTS phone_hash         text,
  ADD COLUMN IF NOT EXISTS email_hash         text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_hash
  ON public.profiles (phone_hash)
  WHERE phone_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_hash
  ON public.profiles (email_hash)
  WHERE email_hash IS NOT NULL;

-- ─── Encrypted fields on user_documents ──────────────────────
ALTER TABLE public.user_documents
  ADD COLUMN IF NOT EXISTS document_number_encrypted  text,
  ADD COLUMN IF NOT EXISTS document_hash              text;  -- For dedup / uniqueness check

-- ─── Encrypted fields on host_profiles ───────────────────────
ALTER TABLE public.host_profiles
  ADD COLUMN IF NOT EXISTS gst_number_encrypted       text,
  ADD COLUMN IF NOT EXISTS bank_account_encrypted     text,
  ADD COLUMN IF NOT EXISTS ifsc_code_encrypted        text,
  ADD COLUMN IF NOT EXISTS upi_id_encrypted           text,
  ADD COLUMN IF NOT EXISTS pan_number_encrypted       text;

-- ─── KYC metadata encryption ─────────────────────────────────
ALTER TABLE public.kyc_submissions
  ADD COLUMN IF NOT EXISTS metadata_encrypted  text;

-- ─── Hub partners — encrypt contact PII ──────────────────────
ALTER TABLE public.hub_partners
  ADD COLUMN IF NOT EXISTS partner_phone_encrypted  text,
  ADD COLUMN IF NOT EXISTS partner_email_encrypted  text,
  ADD COLUMN IF NOT EXISTS partner_phone_hash       text,
  ADD COLUMN IF NOT EXISTS partner_email_hash       text;

-- ─── Lookup function: find profile by phone hash ─────────────
CREATE OR REPLACE FUNCTION public.find_profile_by_phone_hash(p_hash text)
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM public.profiles WHERE phone_hash = p_hash LIMIT 1;
$$;

-- ─── Lookup function: find profile by email hash ─────────────
CREATE OR REPLACE FUNCTION public.find_profile_by_email_hash(p_hash text)
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id FROM public.profiles WHERE email_hash = p_hash LIMIT 1;
$$;

-- ─── Migrate existing phone → phone_hash (backfill) ──────────
-- SHA-256 of the phone number. This is done without pgcrypto
-- by storing a placeholder — actual hash will be backfilled by
-- the migration edge function once deployed.
-- We mark existing rows as needing hash with a sentinel so the
-- backfill edge function can find them.
UPDATE public.profiles
SET phone_hash = 'NEEDS_BACKFILL_' || id::text
WHERE phone IS NOT NULL
  AND phone_hash IS NULL;

-- ─── phone_auth_users: add hash column ───────────────────────
ALTER TABLE public.phone_auth_users
  ADD COLUMN IF NOT EXISTS phone_hash  text;

CREATE INDEX IF NOT EXISTS idx_pau_phone_hash
  ON public.phone_auth_users (phone_hash)
  WHERE phone_hash IS NOT NULL;
