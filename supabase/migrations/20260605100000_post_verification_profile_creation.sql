-- =============================================================
-- POST-VERIFICATION PROFILE CREATION
-- Run in Supabase → SQL Editor → New Query → Run All
-- =============================================================
-- WHAT THIS DOES:
--   1. Drops any triggers that create application records on SIGNUP
--      (before email is verified)
--   2. Creates a trigger that fires AFTER email is confirmed
--      → creates profiles + user_roles only then
--   3. Application code (onboarding) enriches the row later
-- =============================================================

-- ── Step 1: Drop premature triggers ──────────────────────────

-- Drop the old broken trigger (references public.users which doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created          ON auth.users;
DROP TRIGGER IF EXISTS sync_auth_user_trigger         ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user                ON auth.users;
DROP TRIGGER IF EXISTS create_profile_on_signup       ON auth.users;
DROP TRIGGER IF EXISTS on_signup_create_profile       ON auth.users;

-- Drop associated functions
DROP FUNCTION IF EXISTS public.sync_auth_users_to_public_users() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()                 CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_on_signup()        CASCADE;
DROP FUNCTION IF EXISTS public.on_auth_user_confirmed()          CASCADE;

-- ── Step 2: Create post-confirmation trigger function ─────────

CREATE OR REPLACE FUNCTION public.on_auth_user_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER                  -- runs as DB owner, bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- ── Case A: email confirmation ──────────────────────────────
  -- Fire only when email_confirmed_at flips from NULL → value
  IF (
    NEW.email_confirmed_at IS NOT NULL AND
    (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  ) THEN

    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');

    -- Create profile row with phone in international format (+91XXXXXXXXXX)
    INSERT INTO public.profiles (
      id,
      full_name,
      phone,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      CASE
        WHEN NEW.raw_user_meta_data->>'phone' IS NULL THEN NULL
        WHEN NEW.raw_user_meta_data->>'phone' LIKE '+%' THEN NEW.raw_user_meta_data->>'phone'
        ELSE '+91' || regexp_replace(NEW.raw_user_meta_data->>'phone', '[^0-9]', '', 'g')
      END,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create role row (cast text → app_role enum)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

  END IF;

  -- ── Case B: phone confirmation (WhatsApp OTP login) ─────────
  -- Fire only when phone_confirmed_at flips from NULL → value
  IF (
    NEW.phone_confirmed_at IS NOT NULL AND
    (OLD.phone_confirmed_at IS NULL OR OLD.phone_confirmed_at IS DISTINCT FROM NEW.phone_confirmed_at)
  ) THEN

    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');

    INSERT INTO public.profiles (id, phone, created_at, updated_at)
    VALUES (
      NEW.id,
      CASE
        WHEN NEW.phone IS NULL THEN NULL
        WHEN NEW.phone LIKE '+%' THEN NEW.phone
        ELSE '+91' || regexp_replace(NEW.phone, '[^0-9]', '', 'g')
      END,
      NOW(), NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;

-- ── Step 3: Attach trigger to auth.users UPDATE ───────────────
-- Fires after EVERY update to auth.users (fast — only acts when
-- email_confirmed_at or phone_confirmed_at changes)

CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.on_auth_user_confirmed();

-- ── Step 4: Backfill profiles for already-confirmed users ─────
-- Ensures existing verified users have rows (safe if they already do)

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      u.id,
      u.raw_user_meta_data->>'full_name' AS full_name,
      u.raw_user_meta_data->>'phone'     AS phone,
      COALESCE(u.raw_user_meta_data->>'role', 'user') AS role
    FROM auth.users u
    WHERE u.email_confirmed_at IS NOT NULL
       OR u.phone_confirmed_at IS NOT NULL
  LOOP
    INSERT INTO public.profiles (id, full_name, phone, created_at, updated_at)
    VALUES (r.id, r.full_name, r.phone, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (r.id, r.role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;
END;
$$;

-- ── Step 5: Re-enable email confirmation in Supabase ─────────
-- NOTE: After running this SQL, go to:
--   Supabase Dashboard → Authentication → Sign In / Providers → Email
--   Toggle ON "Confirm email"  →  Save Changes
-- This ensures new signups require verification before they can log in.
