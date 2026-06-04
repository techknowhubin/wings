-- ============================================================
-- LISTING TYPE ACCESS CONTROL
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- 1. Add columns to host_profiles
ALTER TABLE public.host_profiles
  ADD COLUMN IF NOT EXISTS primary_listing_type   TEXT,
  ADD COLUMN IF NOT EXISTS approved_listing_types TEXT[] DEFAULT '{}';

-- 2. Create listing_type_requests table
CREATE TABLE IF NOT EXISTS public.listing_type_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_type  TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
  host_note       TEXT,
  admin_notes     TEXT,
  reviewed_by     UUID        REFERENCES auth.users(id),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (host_id, requested_type)
);

ALTER TABLE public.listing_type_requests ENABLE ROW LEVEL SECURITY;

-- Hosts can insert and view their own requests
DROP POLICY IF EXISTS "host_view_own_requests"   ON public.listing_type_requests;
DROP POLICY IF EXISTS "host_insert_own_requests" ON public.listing_type_requests;
DROP POLICY IF EXISTS "admin_manage_requests"    ON public.listing_type_requests;

CREATE POLICY "host_view_own_requests" ON public.listing_type_requests
  FOR SELECT TO authenticated USING (host_id = auth.uid());

CREATE POLICY "host_insert_own_requests" ON public.listing_type_requests
  FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());

CREATE POLICY "admin_manage_requests" ON public.listing_type_requests
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. SECURITY DEFINER function to approve a listing type request
CREATE OR REPLACE FUNCTION public.admin_approve_listing_type(request_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO req FROM public.listing_type_requests WHERE id = request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;

  -- Add type to approved list (avoid duplicates)
  UPDATE public.host_profiles
  SET approved_listing_types = array_append(
        array_remove(COALESCE(approved_listing_types, '{}'), req.requested_type),
        req.requested_type
      ),
      updated_at = now()
  WHERE id = req.host_id;

  -- Mark request as approved
  UPDATE public.listing_type_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = request_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_listing_type(UUID) TO authenticated;

-- 4. SECURITY DEFINER function to reject a listing type request
CREATE OR REPLACE FUNCTION public.admin_reject_listing_type(request_id UUID, notes TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.listing_type_requests
  SET status = 'rejected', admin_notes = notes, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  WHERE id = request_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reject_listing_type(UUID, TEXT) TO authenticated;
