-- ============================================================
-- AUTH EMAIL CHECK — Run ONCE in Supabase SQL Editor
-- ============================================================

-- Checks whether an email address is already registered in auth.users.
-- Uses SECURITY DEFINER so the anon client can access auth.users safely.
-- The function reveals ONLY a boolean — no user data is exposed.

CREATE OR REPLACE FUNCTION public.check_email_registered(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(email) = lower(check_email)
      AND (deleted_at IS NULL OR deleted_at > now())
  );
$$;

-- Allow both anonymous and authenticated callers
GRANT EXECUTE ON FUNCTION public.check_email_registered(TEXT) TO anon, authenticated;
