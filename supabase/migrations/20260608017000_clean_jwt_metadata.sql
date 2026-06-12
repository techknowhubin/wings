-- =============================================================
-- JWT METADATA CLEANUP
-- Remove PII from raw_user_meta_data after it is seeded into
-- the profiles table. JWT payloads will no longer contain
-- full_name, phone, role, or phone_provider.
--
-- LIMITATION (OAuth/Google):
--   Supabase GoTrue re-populates raw_user_meta_data on every
--   OAuth sign-in from the provider. The INSERT trigger cleanup
--   helps on first login only. Subsequent logins will re-inject
--   OAuth fields. The defense-in-depth fix (done in the frontend)
--   is to stop reading PII from user_metadata entirely.
-- =============================================================

-- ── 1. on_auth_user_confirmed: clear metadata after profile seed ──────────────
-- Fires AFTER UPDATE on auth.users when email_confirmed_at or
-- phone_confirmed_at first becomes non-null.

CREATE OR REPLACE FUNCTION public.on_auth_user_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role        TEXT;
  v_cleaned_meta JSONB;
BEGIN
  -- ── Case A: email confirmation ──────────────────────────────
  IF (
    NEW.email_confirmed_at IS NOT NULL AND
    (OLD.email_confirmed_at IS NULL OR
     OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  ) THEN

    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');

    INSERT INTO public.profiles (id, full_name, phone, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      CASE
        WHEN NEW.raw_user_meta_data->>'phone' IS NULL THEN NULL
        WHEN NEW.raw_user_meta_data->>'phone' LIKE '+%'
          THEN NEW.raw_user_meta_data->>'phone'
        ELSE '+91' || regexp_replace(NEW.raw_user_meta_data->>'phone', '[^0-9]', '', 'g')
      END,
      NOW(), NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Strip PII from metadata after seeding profile.
    -- Keep: avatar_url (OAuth profile picture), email_verified (harmless boolean).
    -- The inner UPDATE changes only raw_user_meta_data, so
    -- email_confirmed_at stays the same → this trigger's guard prevents
    -- re-entry on the resulting UPDATE event.
    v_cleaned_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
      - 'full_name'
      - 'phone'
      - 'role'
      - 'phone_provider';

    UPDATE auth.users
    SET raw_user_meta_data = v_cleaned_meta
    WHERE id = NEW.id;

  END IF;

  -- ── Case B: phone confirmation (WhatsApp OTP) ───────────────
  IF (
    NEW.phone_confirmed_at IS NOT NULL AND
    (OLD.phone_confirmed_at IS NULL OR
     OLD.phone_confirmed_at IS DISTINCT FROM NEW.phone_confirmed_at)
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

    v_cleaned_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
      - 'phone'
      - 'phone_provider'
      - 'role';

    UPDATE auth.users
    SET raw_user_meta_data = v_cleaned_meta
    WHERE id = NEW.id;

  END IF;

  RETURN NEW;
END;
$$;

-- ── 2. handle_new_user: clear PII for OAuth/social sign-ins ──────────────────
-- Fires AFTER INSERT on auth.users. For Google/OAuth users GoTrue re-populates
-- raw_user_meta_data on every sign-in, so this only clears the first-login JWT.
-- The permanent fix is removing user_metadata reads in the frontend.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  target_role    public.app_role;
  auth_provider  TEXT;
  is_social_auth BOOLEAN;
  is_confirmed   BOOLEAN;
  v_cleaned_meta JSONB;
BEGIN
  auth_provider  := NEW.raw_app_meta_data->>'provider';
  is_social_auth := auth_provider IS NOT NULL AND auth_provider NOT IN ('email', 'phone');

  -- ── Social auth (Google, etc.) ─────────────────────────────────────────────
  IF is_social_auth THEN
    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone)
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone     = COALESCE(EXCLUDED.phone,     public.profiles.phone);

    -- Clear provider-injected PII; keep avatar_url for profile picture display.
    -- Note: GoTrue re-injects these on every OAuth login (limitation, see header).
    v_cleaned_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
      - 'full_name'
      - 'name'
      - 'email'
      - 'picture'
      - 'iss'
      - 'sub';

    UPDATE auth.users
    SET raw_user_meta_data = v_cleaned_meta
    WHERE id = NEW.id;

    RETURN NEW;
  END IF;

  -- ── Email / phone auth ─────────────────────────────────────────────────────
  is_confirmed := (NEW.email_confirmed_at IS NOT NULL)
               OR (NEW.phone_confirmed_at IS NOT NULL);

  IF is_confirmed THEN
    target_role := COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.app_role,
      'user'::public.app_role
    );

    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone)
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone     = COALESCE(EXCLUDED.phone,     public.profiles.phone);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, target_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    v_cleaned_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
      - 'full_name'
      - 'phone'
      - 'role'
      - 'phone_provider';

    UPDATE auth.users
    SET raw_user_meta_data = v_cleaned_meta
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 3. Backfill: clear PII from all existing confirmed users ──────────────────
-- Safe to run multiple times — only updates rows that still have the fields.
UPDATE auth.users
SET raw_user_meta_data = (
  COALESCE(raw_user_meta_data, '{}'::jsonb)
    - 'full_name'
    - 'phone'
    - 'role'
    - 'phone_provider'
    - 'name'
    - 'email'
    - 'picture'
    - 'iss'
    - 'sub'
)
WHERE (email_confirmed_at IS NOT NULL OR phone_confirmed_at IS NOT NULL)
  AND (
    raw_user_meta_data ? 'full_name'
    OR raw_user_meta_data ? 'phone'
    OR raw_user_meta_data ? 'role'
    OR raw_user_meta_data ? 'phone_provider'
    OR raw_user_meta_data ? 'name'
    OR raw_user_meta_data ? 'email'
    OR raw_user_meta_data ? 'picture'
    OR raw_user_meta_data ? 'iss'
    OR raw_user_meta_data ? 'sub'
  );
