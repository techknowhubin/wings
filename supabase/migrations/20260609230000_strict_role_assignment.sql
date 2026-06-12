-- ============================================================
-- Strict Role Assignment Migration
--
-- Enforces:
--   - Remove any hardcoded default role = traveler.
--   - Store selected role in auth metadata.
--   - Store selected role in profiles table.
--   - Validate role before profile creation.
--   - Enforce validation rules:
--       * One user = One role.
--       * One user = One profile type (cannot have both host and traveler profiles).
--       * User cannot have multiple roles simultaneously.
--       * Registration must fail if role is missing.
-- ============================================================

-- 1. Schema Updates
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.app_role;

-- Clean up duplicate roles in public.user_roles: keep only one role per user
-- Priority: admin > host > user
WITH duplicates AS (
  SELECT id, user_id, role,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY CASE role
             WHEN 'admin'::public.app_role THEN 1
             WHEN 'host'::public.app_role THEN 2
             WHEN 'user'::public.app_role THEN 3
             ELSE 4
           END ASC,
           created_at DESC
         ) as rn
  FROM public.user_roles
)
DELETE FROM public.user_roles
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Backfill role to profiles from user_roles
UPDATE public.profiles p
SET role = ur.role
FROM public.user_roles ur
WHERE ur.user_id = p.id;

-- Drop defaults
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN role DROP NOT NULL;

-- Enforce One User = One Role (single role row per user)
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_unique;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);


-- 2. Redefine Sync Functions with Role Validation

-- sync_auth_users_to_public_users
CREATE OR REPLACE FUNCTION public.sync_auth_users_to_public_users()
RETURNS TRIGGER AS $$
DECLARE
    target_role    public.app_role;
    user_full_name text;
    mobile         text;
    auth_provider  TEXT;
    is_verified    boolean;
BEGIN
    auth_provider := NEW.raw_app_meta_data->>'provider';

    -- Skip social auth users — synced during onboarding completion.
    IF auth_provider IS NOT NULL AND auth_provider NOT IN ('email', 'phone') THEN
        RETURN NEW;
    END IF;

    is_verified := (NEW.email_confirmed_at IS NOT NULL)
               OR (NEW.phone_confirmed_at IS NOT NULL);

    IF NOT is_verified THEN
        RETURN NEW;
    END IF;

    target_role := (NEW.raw_user_meta_data->>'role')::public.app_role;
    IF target_role IS NULL THEN
        RAISE EXCEPTION 'A role is required to sync user';
    END IF;

    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
    mobile         := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, '');

    INSERT INTO public.users (id, full_name, email, mobile_number, role, is_verified, created_at, updated_at)
    VALUES (NEW.id, user_full_name, NEW.email, mobile, target_role, is_verified, now(), now())
    ON CONFLICT (id) DO UPDATE SET
        full_name     = COALESCE(EXCLUDED.full_name,      public.users.full_name),
        email         = COALESCE(EXCLUDED.email,          public.users.email),
        mobile_number = COALESCE(EXCLUDED.mobile_number,  public.users.mobile_number),
        role          = EXCLUDED.role,
        is_verified   = public.users.is_verified OR EXCLUDED.is_verified,
        updated_at    = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- on_auth_user_confirmed
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

    v_role := NEW.raw_user_meta_data->>'role';
    IF v_role IS NULL OR v_role NOT IN ('user', 'host', 'admin', 'moderator', 'hub_partner', 'driver_partner') THEN
      RAISE EXCEPTION 'A valid role is required for registration';
    END IF;

    INSERT INTO public.profiles (id, full_name, phone, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      CASE
        WHEN NEW.raw_user_meta_data->>'phone' IS NULL THEN NULL
        WHEN NEW.raw_user_meta_data->>'phone' LIKE '+%'
          THEN NEW.raw_user_meta_data->>'phone'
        ELSE '+91' || regexp_replace(NEW.raw_user_meta_data->>'phone', '[^0-9]', '', 'g')
      END,
      v_role::app_role,
      NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role::app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

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

    v_role := NEW.raw_user_meta_data->>'role';
    IF v_role IS NULL OR v_role NOT IN ('user', 'host', 'admin', 'moderator', 'hub_partner', 'driver_partner') THEN
      RAISE EXCEPTION 'A valid role is required for registration';
    END IF;

    INSERT INTO public.profiles (id, phone, role, created_at, updated_at)
    VALUES (
      NEW.id,
      CASE
        WHEN NEW.phone IS NULL THEN NULL
        WHEN NEW.phone LIKE '+%' THEN NEW.phone
        ELSE '+91' || regexp_replace(NEW.phone, '[^0-9]', '', 'g')
      END,
      v_role::app_role,
      NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role::app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

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


-- handle_new_user
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
    target_role := (NEW.raw_user_meta_data->>'role')::public.app_role;
    IF target_role IS NULL THEN
      RAISE EXCEPTION 'A role is required for registration';
    END IF;

    INSERT INTO public.profiles (id, full_name, phone, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
      target_role
    )
    ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone     = COALESCE(EXCLUDED.phone,     public.profiles.phone);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, target_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

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


-- 3. Triggers for Auto-Sync & Mutual Exclusivity

-- sync_user_role_to_profile
CREATE OR REPLACE FUNCTION public.sync_user_role_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET role = NEW.role
  WHERE id = NEW.user_id;

  UPDATE public.users
  SET role = NEW.role
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_user_role_to_profile ON public.user_roles;
CREATE TRIGGER trg_sync_user_role_to_profile
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_to_profile();


-- sync_user_role_delete_to_profile
CREATE OR REPLACE FUNCTION public.sync_user_role_delete_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET role = NULL
  WHERE id = OLD.user_id;

  UPDATE public.users
  SET role = NULL
  WHERE id = OLD.user_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_user_role_delete_to_profile ON public.user_roles;
CREATE TRIGGER trg_sync_user_role_delete_to_profile
  AFTER DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_delete_to_profile();


-- check_host_profile_role
CREATE OR REPLACE FUNCTION public.check_host_profile_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.app_role;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = NEW.id;
  IF v_role IS DISTINCT FROM 'host'::public.app_role THEN
    RAISE EXCEPTION 'User must have host role to have a host profile';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_host_profile_role ON public.host_profiles;
CREATE TRIGGER trg_check_host_profile_role
  BEFORE INSERT OR UPDATE ON public.host_profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_host_profile_role();


-- clean_host_profile_on_role_change
CREATE OR REPLACE FUNCTION public.clean_host_profile_on_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM 'host'::public.app_role THEN
    DELETE FROM public.host_profiles WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clean_host_profile_on_role_change ON public.profiles;
CREATE TRIGGER trg_clean_host_profile_on_role_change
  AFTER UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.clean_host_profile_on_role_change();


-- 4. Update admin_change_user_role to update users table too
CREATE OR REPLACE FUNCTION public.admin_change_user_role(
  p_target_user_id uuid,
  p_new_role        app_role,
  p_reason          text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old_role app_role;
BEGIN
  -- Must be admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  -- Prevent changing own role (safety)
  IF p_target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot change their own role via this function';
  END IF;

  -- Get current role
  SELECT role INTO v_old_role FROM public.user_roles WHERE user_id = p_target_user_id;

  IF v_old_role = p_new_role THEN
    RETURN jsonb_build_object('success', false, 'message', 'User already has this role');
  END IF;

  -- Update role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_target_user_id, p_new_role)
  ON CONFLICT (user_id) DO UPDATE SET role = p_new_role;

  -- Sync to profiles
  UPDATE public.profiles SET role = p_new_role WHERE id = p_target_user_id;
  -- Sync to users
  UPDATE public.users SET role = p_new_role WHERE id = p_target_user_id;

  -- Audit log
  PERFORM public.log_audit_event(
    p_target_user_id,
    auth.uid(),
    'admin_role_change',
    'user',
    p_target_user_id::text,
    NULL,
    jsonb_build_object('role', v_old_role),
    jsonb_build_object('role', p_new_role),
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('success', true, 'old_role', v_old_role, 'new_role', p_new_role);
END;
$$;
