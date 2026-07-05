-- Fix QR token validation for both anon and authenticated travellers.
--
-- Problem: host_qr_codes RLS only allows hosts and admins to SELECT rows.
-- A logged-in traveller (authenticated, not host/admin) gets null back,
-- which the frontend interprets as "invalid QR".
--
-- Solution: a SECURITY DEFINER function that runs as the DB owner,
-- bypassing RLS entirely, so any caller (anon or authenticated) can
-- validate a token without exposing other rows.

CREATE OR REPLACE FUNCTION public.validate_host_qr_token(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_id        UUID;
  v_host_id   UUID;
  v_qr_status TEXT;
BEGIN
  SELECT id, host_id, qr_status
  INTO v_id, v_host_id, v_qr_status
  FROM public.host_qr_codes
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_qr_status != 'active' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'revoked');
  END IF;

  RETURN jsonb_build_object(
    'valid',      true,
    'id',         v_id,
    'host_id',    v_host_id,
    'qr_status',  v_qr_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_host_qr_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_host_qr_token(TEXT) TO anon, authenticated;
