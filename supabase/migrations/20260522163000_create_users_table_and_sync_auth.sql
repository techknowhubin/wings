-- Create a dedicated users table for application-level auth metadata.
-- This table is synchronized from auth.users and stores only safe profile data.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('user', 'host', 'admin', 'moderator');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL UNIQUE,
  mobile_number text NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'user',
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_mobile_number ON public.users (mobile_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own row" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.sync_auth_users_to_public_users()
RETURNS TRIGGER AS $$
DECLARE
  target_role public.app_role;
  user_full_name text;
  mobile text;
  currently_verified boolean;
BEGIN
  -- Only sync users after email or phone verification, or social auth
  currently_verified := (NEW.email_confirmed_at IS NOT NULL)
    OR (NEW.phone_confirmed_at IS NOT NULL)
    OR (NEW.raw_app_meta_data->>'provider' IS NOT NULL AND NEW.raw_app_meta_data->>'provider' NOT IN ('email', 'phone'));

  -- Exit early if user is not verified and this is NOT a social auth signup
  IF NOT currently_verified AND (NEW.raw_app_meta_data->>'provider' IS NULL OR NEW.raw_app_meta_data->>'provider' IN ('email', 'phone')) THEN
    RETURN NEW;
  END IF;

  target_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user')::public.app_role;
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
  mobile := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, '');

  INSERT INTO public.users (id, full_name, email, mobile_number, role, is_verified, created_at, updated_at)
  VALUES (NEW.id, user_full_name, NEW.email, mobile, target_role, currently_verified, now(), now())
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    email = COALESCE(EXCLUDED.email, public.users.email),
    mobile_number = COALESCE(EXCLUDED.mobile_number, public.users.mobile_number),
    role = COALESCE(EXCLUDED.role, public.users.role),
    is_verified = public.users.is_verified OR EXCLUDED.is_verified,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_sync ON auth.users;
CREATE TRIGGER on_auth_user_sync
  AFTER INSERT OR UPDATE OF email_confirmed_at, phone_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_auth_users_to_public_users();
