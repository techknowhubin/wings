-- ============================================================
-- Phase 11: Audit Logs
-- Tracks all security-relevant actions across the platform
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          bigserial    PRIMARY KEY,
  user_id     uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_id    uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text         NOT NULL,
  entity_type text,                     -- 'booking', 'listing', 'user', 'kyc', etc.
  entity_id   text,                     -- UUID of the affected record
  ip_address  text,
  old_value   jsonb,                    -- snapshot before change
  new_value   jsonb,                    -- snapshot after change
  metadata    jsonb,                    -- extra context
  created_at  timestamptz  NOT NULL DEFAULT now()
);

-- Partition-friendly indexes
CREATE INDEX IF NOT EXISTS idx_al_user_id   ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_al_actor_id  ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_al_action    ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_al_created   ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_al_entity    ON public.audit_logs (entity_type, entity_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit trail
DROP POLICY IF EXISTS "audit_logs_select_own" ON public.audit_logs;
CREATE POLICY "audit_logs_select_own"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all
DROP POLICY IF EXISTS "audit_logs_admin_select" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_select"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only service role can insert (edge functions + triggers)
-- No direct insert from client

-- ─── Helper: log an action ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id     uuid,
  p_actor_id    uuid,
  p_action      text,
  p_entity_type text  DEFAULT NULL,
  p_entity_id   text  DEFAULT NULL,
  p_ip_address  text  DEFAULT NULL,
  p_old_value   jsonb DEFAULT NULL,
  p_new_value   jsonb DEFAULT NULL,
  p_metadata    jsonb DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id, actor_id, action, entity_type, entity_id,
    ip_address, old_value, new_value, metadata
  ) VALUES (
    p_user_id, p_actor_id, p_action, p_entity_type, p_entity_id,
    p_ip_address, p_old_value, p_new_value, p_metadata
  );
END;
$$;

-- ─── Trigger: log profile changes ────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_audit_profile_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Only log if sensitive fields changed
    IF OLD.account_status IS DISTINCT FROM NEW.account_status
    OR OLD.kyc_status     IS DISTINCT FROM NEW.kyc_status
    THEN
      PERFORM public.log_audit_event(
        NEW.id,
        auth.uid(),
        'profile_' || TG_OP::text,
        'profile',
        NEW.id::text,
        NULL,
        jsonb_build_object('account_status', OLD.account_status, 'kyc_status', OLD.kyc_status),
        jsonb_build_object('account_status', NEW.account_status, 'kyc_status', NEW.kyc_status),
        NULL
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_profile ON public.profiles;
CREATE TRIGGER trg_audit_profile
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_profile_change();

-- ─── Trigger: log role changes ────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_audit_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    PERFORM public.log_audit_event(
      NEW.user_id,
      auth.uid(),
      'role_changed',
      'user_roles',
      NEW.user_id::text,
      NULL,
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role),
      NULL
    );
  ELSIF (TG_OP = 'INSERT') THEN
    PERFORM public.log_audit_event(
      NEW.user_id,
      auth.uid(),
      'role_assigned',
      'user_roles',
      NEW.user_id::text,
      NULL, NULL,
      jsonb_build_object('role', NEW.role),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_role ON public.user_roles;
CREATE TRIGGER trg_audit_role
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_role_change();

-- ─── Trigger: log booking changes ────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_audit_booking_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.booking_status IS DISTINCT FROM NEW.booking_status
    OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
    THEN
      PERFORM public.log_audit_event(
        NEW.user_id,
        auth.uid(),
        'booking_status_changed',
        'booking',
        NEW.id::text,
        NULL,
        jsonb_build_object('booking_status', OLD.booking_status, 'payment_status', OLD.payment_status),
        jsonb_build_object('booking_status', NEW.booking_status, 'payment_status', NEW.payment_status),
        NULL
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_booking ON public.bookings;
CREATE TRIGGER trg_audit_booking
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_booking_change();

-- ─── Trigger: log KYC status changes ─────────────────────────
CREATE OR REPLACE FUNCTION public.trg_audit_kyc_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.log_audit_event(
      NEW.user_id,
      COALESCE(NEW.reviewed_by, auth.uid()),
      'kyc_status_changed',
      'kyc_submission',
      NEW.id::text,
      NULL,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'reviewed_by', NEW.reviewed_by),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_kyc ON public.kyc_submissions;
CREATE TRIGGER trg_audit_kyc
  AFTER UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_kyc_change();
