-- ============================================================
-- COMPREHENSIVE FIX: Admin Operations + Phone Storage
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- ── 1. Ensure host_profiles has all required columns ─────────
ALTER TABLE public.host_profiles
  ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS host_type         text DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS city              text,
  ADD COLUMN IF NOT EXISTS state             text,
  ADD COLUMN IF NOT EXISTS phone             text,
  ADD COLUMN IF NOT EXISTS email             text;

-- ── 2. Admin policies for host_profiles ──────────────────────
ALTER TABLE public.host_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all host profiles"   ON public.host_profiles;
DROP POLICY IF EXISTS "Admins can update all host profiles" ON public.host_profiles;
DROP POLICY IF EXISTS "Admins can insert all host profiles" ON public.host_profiles;
DROP POLICY IF EXISTS "Admins can delete all host profiles" ON public.host_profiles;

CREATE POLICY "Admins can view all host profiles"
  ON public.host_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all host profiles"
  ON public.host_profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert all host profiles"
  ON public.host_profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all host profiles"
  ON public.host_profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── 3. Admin policies for profiles (in case not applied) ─────
DROP POLICY IF EXISTS "Admins can view all profiles"   ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── 4. SECURITY DEFINER functions (bypass RLS for admin ops) ──

-- Approve host: updates both host_profiles and profiles
CREATE OR REPLACE FUNCTION public.admin_approve_host(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized: admin role required';
  END IF;

  UPDATE public.host_profiles
  SET onboarding_status = 'approved', updated_at = now()
  WHERE id = target_user_id;

  UPDATE public.profiles
  SET kyc_status = 'approved', updated_at = now()
  WHERE id = target_user_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_host(UUID) TO authenticated;

-- Reject host
CREATE OR REPLACE FUNCTION public.admin_reject_host(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized: admin role required';
  END IF;

  UPDATE public.host_profiles
  SET onboarding_status = 'rejected', updated_at = now()
  WHERE id = target_user_id;

  UPDATE public.profiles
  SET kyc_status = 'rejected', updated_at = now()
  WHERE id = target_user_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reject_host(UUID) TO authenticated;

-- ── 5. Fix phone storage trigger ─────────────────────────────
-- Drop and recreate to ensure phone is captured from metadata

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created   ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  target_role public.app_role;
  is_confirmed BOOLEAN;
BEGIN
  is_confirmed :=
    (NEW.email_confirmed_at IS NOT NULL) OR
    (NEW.phone_confirmed_at IS NOT NULL) OR
    (NEW.raw_app_meta_data->>'provider' IS NOT NULL
     AND NEW.raw_app_meta_data->>'provider' NOT IN ('email', 'phone'));

  IF is_confirmed THEN
    target_role := COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.app_role,
      'user'::public.app_role
    );

    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name'
      ),
      COALESCE(
        NEW.raw_user_meta_data->>'phone',
        NEW.phone
      )
    )
    ON CONFLICT (id) DO UPDATE
    SET
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone     = COALESCE(EXCLUDED.phone,     public.profiles.phone),
      updated_at = now();

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, target_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_confirmed
  AFTER INSERT OR UPDATE OF email_confirmed_at, phone_confirmed_at
  ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 6. Backfill phone for existing users ─────────────────────
UPDATE public.profiles p
SET phone = au.raw_user_meta_data->>'phone',
    updated_at = now()
FROM auth.users au
WHERE p.id = au.id
  AND (p.phone IS NULL OR p.phone = '')
  AND au.raw_user_meta_data->>'phone' IS NOT NULL
  AND au.raw_user_meta_data->>'phone' != '';
