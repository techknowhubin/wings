-- ============================================================
-- Phase 3: JWT Security — Session Revocation & Role Hardening
-- ============================================================

-- ─── Extend app_role enum with new roles ─────────────────────
-- Check if values already exist before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'hub_partner'
      AND enumtypid = 'public.app_role'::regtype
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'hub_partner';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'driver_partner'
      AND enumtypid = 'public.app_role'::regtype
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'driver_partner';
  END IF;
END;
$$;

-- ─── Revoked sessions table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.revoked_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revoked_at  timestamptz NOT NULL DEFAULT now(),
  revoked_by  uuid        REFERENCES auth.users(id),  -- admin who forced logout
  reason      text,
  revoked     boolean     NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_rs_user_id ON public.revoked_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_rs_revoked ON public.revoked_sessions (revoked, revoked_at DESC);

ALTER TABLE public.revoked_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own revocations" ON public.revoked_sessions;
CREATE POLICY "Users can view own revocations"
  ON public.revoked_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage revocations" ON public.revoked_sessions;
CREATE POLICY "Admins manage revocations"
  ON public.revoked_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ─── User suspension & ban fields ────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'banned')),
  ADD COLUMN IF NOT EXISTS suspended_at    timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_by    uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS banned_at       timestamptz,
  ADD COLUMN IF NOT EXISTS banned_by       uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS ban_reason      text;

-- ─── Function: revoke all sessions for a user ─────────────────
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(
  p_user_id uuid,
  p_reason  text DEFAULT 'admin_action'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  INSERT INTO public.revoked_sessions (user_id, revoked_by, reason)
  VALUES (p_user_id, auth.uid(), p_reason);

  -- Also ban the user via Supabase auth (requires service role — done in edge function)
END;
$$;

-- ─── Function: check if user account is active ────────────────
CREATE OR REPLACE FUNCTION public.is_account_active(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_status text;
BEGIN
  SELECT account_status INTO v_status
  FROM public.profiles
  WHERE id = p_user_id;
  RETURN COALESCE(v_status, 'active') = 'active';
END;
$$;

-- ─── RLS: block suspended/banned users from sensitive tables ──
-- Add account_status check to existing policies via wrapper function
-- All policies that check auth.uid() should also call is_account_active()
