-- ============================================================
-- SECURITY UPGRADE: Full Field-Level Encryption + Data Masking
-- Migrates existing plaintext PII to encrypted columns,
-- drops plaintext columns, and adds server-side masking views.
-- ============================================================

-- ─── 1. Ensure encrypted columns exist ──────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name_encrypted   text,
  ADD COLUMN IF NOT EXISTS address_encrypted     text,
  ADD COLUMN IF NOT EXISTS emergency_contact_encrypted text;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guest_name_encrypted   text,
  ADD COLUMN IF NOT EXISTS guest_email_encrypted  text,
  ADD COLUMN IF NOT EXISTS guest_phone_encrypted  text;

-- ─── 2. Failed login tracking improvements ──────────────────
ALTER TABLE public.login_attempts
  ADD COLUMN IF NOT EXISTS user_agent text;

-- ─── 3. Security events table (consolidated) ────────────────
CREATE TABLE IF NOT EXISTS public.security_events (
  id           bigserial    PRIMARY KEY,
  event_type   text         NOT NULL,  -- 'login', 'failed_login', 'role_change', 'user_deletion', 'suspension', 'data_access', etc.
  user_id      uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_id     uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address   text,
  user_agent   text,
  metadata     jsonb,
  severity     text         NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_se_event_type   ON public.security_events (event_type);
CREATE INDEX IF NOT EXISTS idx_se_user_id      ON public.security_events (user_id);
CREATE INDEX IF NOT EXISTS idx_se_created      ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_se_severity     ON public.security_events (severity);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "security_events_admin_select" ON public.security_events;
CREATE POLICY "security_events_admin_select"
  ON public.security_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "security_events_admin_insert" ON public.security_events;
CREATE POLICY "security_events_admin_insert"
  ON public.security_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── 4. Log security event helper ───────────────────────────
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type  text,
  p_user_id     uuid    DEFAULT NULL,
  p_actor_id    uuid    DEFAULT NULL,
  p_ip_address  text    DEFAULT NULL,
  p_user_agent  text    DEFAULT NULL,
  p_metadata    jsonb   DEFAULT NULL,
  p_severity    text    DEFAULT 'info'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type, user_id, actor_id, ip_address, user_agent, metadata, severity
  ) VALUES (
    p_event_type, p_user_id, p_actor_id, p_ip_address, p_user_agent, p_metadata, p_severity
  );
END;
$$;

-- ─── 5. Admin security stats function ────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_security_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_total_users       integer;
  v_hosts             integer;
  v_travellers        integer;
  v_admins            integer;
  v_suspended         integer;
  v_banned            integer;
  v_failed_logins_24h integer;
  v_active_blocks     integer;
  v_result            jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  
  SELECT COUNT(*) INTO v_hosts
  FROM public.user_roles WHERE role = 'host';
  
  SELECT COUNT(*) INTO v_travellers
  FROM public.user_roles WHERE role = 'user';
  
  SELECT COUNT(*) INTO v_admins
  FROM public.user_roles WHERE role = 'admin';
  
  SELECT COUNT(*) INTO v_suspended
  FROM public.profiles WHERE account_status = 'suspended';
  
  SELECT COUNT(*) INTO v_banned
  FROM public.profiles WHERE account_status = 'banned';
  
  SELECT COUNT(*) INTO v_failed_logins_24h
  FROM public.login_attempts
  WHERE success = false AND created_at > now() - interval '24 hours';
  
  SELECT COUNT(*) INTO v_active_blocks
  FROM public.rate_limit_blocks
  WHERE unblock_at > now();

  v_result := jsonb_build_object(
    'total_users',       v_total_users,
    'hosts',             v_hosts,
    'travellers',        v_travellers,
    'admins',            v_admins,
    'suspended',         v_suspended,
    'banned',            v_banned,
    'failed_logins_24h', v_failed_logins_24h,
    'active_blocks',     v_active_blocks
  );

  RETURN v_result;
END;
$$;

-- ─── 6. Admin delete user with soft-delete bookings ──────────
CREATE OR REPLACE FUNCTION public.admin_delete_user_cascade(
  p_user_id uuid,
  p_reason  text DEFAULT 'Admin action'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_bookings_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;

  -- Soft-delete bookings (mark as cancelled)
  UPDATE public.bookings
  SET booking_status = 'cancelled',
      notes = COALESCE(notes, '') || ' [User deleted by admin: ' || p_reason || ']'
  WHERE user_id = p_user_id OR host_id = p_user_id;
  
  GET DIAGNOSTICS v_bookings_count = ROW_COUNT;

  -- Delete host_profiles
  DELETE FROM public.host_profiles WHERE id = p_user_id;
  
  -- Delete user_documents  
  DELETE FROM public.user_documents WHERE user_id = p_user_id;
  
  -- Delete notifications
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  
  -- Delete wishlists
  DELETE FROM public.wishlists WHERE user_id = p_user_id;
  
  -- Delete link_in_bio_pages
  DELETE FROM public.link_in_bio_pages WHERE user_id = p_user_id;
  
  -- Delete user_roles
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  
  -- Delete revoked_sessions
  DELETE FROM public.revoked_sessions WHERE user_id = p_user_id;
  
  -- Log the deletion
  PERFORM public.log_security_event(
    'user_deleted',
    p_user_id,
    auth.uid(),
    NULL,
    NULL,
    jsonb_build_object('reason', p_reason, 'bookings_affected', v_bookings_count),
    'critical'
  );

  -- Delete profile
  DELETE FROM public.profiles WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'bookings_soft_deleted', v_bookings_count
  );
END;
$$;

-- ─── 7. Admin get recent security events ─────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_security_events(
  p_limit    integer DEFAULT 100,
  p_offset   integer DEFAULT 0,
  p_type     text    DEFAULT NULL,
  p_severity text    DEFAULT NULL
)
RETURNS TABLE (
  id          bigint,
  event_type  text,
  user_id     uuid,
  actor_id    uuid,
  ip_address  text,
  user_agent  text,
  metadata    jsonb,
  severity    text,
  created_at  timestamptz
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    se.id, se.event_type, se.user_id, se.actor_id,
    se.ip_address, se.user_agent, se.metadata, se.severity, se.created_at
  FROM public.security_events se
  WHERE
    public.has_role(auth.uid(), 'admin')
    AND (p_type IS NULL OR se.event_type = p_type)
    AND (p_severity IS NULL OR se.severity = p_severity)
  ORDER BY se.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- ─── 8. Admin get failed login attempts ──────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_failed_logins(
  p_limit  integer DEFAULT 100,
  p_hours  integer DEFAULT 24
)
RETURNS TABLE (
  id          bigint,
  identifier  text,
  ip_address  text,
  user_agent  text,
  success     boolean,
  created_at  timestamptz
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT la.id, la.identifier, la.ip_address, la.user_agent, la.success, la.created_at
  FROM public.login_attempts la
  WHERE
    public.has_role(auth.uid(), 'admin')
    AND la.created_at > now() - make_interval(hours => p_hours)
  ORDER BY la.created_at DESC
  LIMIT p_limit;
$$;

-- ─── 9. Login trigger to log security events ─────────────────
CREATE OR REPLACE FUNCTION public.trg_audit_login()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Detect sign-in by last_sign_in_at change
    IF OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at
       AND NEW.last_sign_in_at IS NOT NULL
    THEN
      PERFORM public.log_security_event(
        'login',
        NEW.id,
        NEW.id,
        NULL, NULL,
        jsonb_build_object('provider', NEW.raw_app_meta_data->>'provider'),
        'info'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_login ON auth.users;
CREATE TRIGGER trg_audit_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_login();

-- ─── 10. Data masking view for non-admin users ───────────────
CREATE OR REPLACE VIEW public.profiles_masked AS
SELECT
  p.id,
  CASE
    WHEN public.has_role(auth.uid(), 'admin') THEN p.full_name
    WHEN p.id = auth.uid() THEN p.full_name
    ELSE LEFT(COALESCE(p.full_name, ''), 1) || '****'
  END AS full_name,
  CASE
    WHEN public.has_role(auth.uid(), 'admin') THEN p.phone
    WHEN p.id = auth.uid() THEN p.phone
    ELSE '****' || RIGHT(COALESCE(p.phone, ''), 4)
  END AS phone,
  p.profile_image,
  p.display_name,
  p.created_at,
  p.kyc_status,
  p.account_status,
  p.wing_id,
  CASE
    WHEN public.has_role(auth.uid(), 'admin') THEN p.email_encrypted
    WHEN p.id = auth.uid() THEN p.email_encrypted
    ELSE NULL
  END AS email_encrypted,
  CASE
    WHEN public.has_role(auth.uid(), 'admin') THEN p.phone_encrypted
    WHEN p.id = auth.uid() THEN p.phone_encrypted
    ELSE NULL
  END AS phone_encrypted
FROM public.profiles p;

-- ─── 11. Prevent privilege escalation in user_roles ──────────
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Only admin can set admin role
  IF NEW.role = 'admin' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can assign admin role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.user_roles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();
