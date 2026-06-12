-- ============================================================
-- Phase 10: Role Management Functions
-- All role changes are admin-only and fully audit-logged
-- ============================================================

-- ─── Change user role (admin only) ───────────────────────────
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

  -- Also sync to profiles.role if column exists
  UPDATE public.profiles SET role = p_new_role WHERE id = p_target_user_id;

  -- Audit log (trigger will also fire, but we add extra context here)
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

-- ─── Suspend user (admin only) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_suspend_user(
  p_user_id uuid,
  p_reason  text DEFAULT 'Policy violation'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE public.profiles
  SET account_status    = 'suspended',
      suspended_at      = now(),
      suspended_by      = auth.uid(),
      suspension_reason = p_reason
  WHERE id = p_user_id;

  -- Revoke active sessions
  INSERT INTO public.revoked_sessions (user_id, revoked_by, reason)
  VALUES (p_user_id, auth.uid(), 'account_suspended');

  PERFORM public.log_audit_event(
    p_user_id, auth.uid(), 'user_suspended', 'user', p_user_id::text,
    NULL, NULL, jsonb_build_object('account_status', 'suspended'),
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('success', true, 'status', 'suspended');
END;
$$;

-- ─── Ban user (admin only) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_ban_user(
  p_user_id uuid,
  p_reason  text DEFAULT 'Policy violation'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE public.profiles
  SET account_status = 'banned',
      banned_at      = now(),
      banned_by      = auth.uid(),
      ban_reason     = p_reason
  WHERE id = p_user_id;

  INSERT INTO public.revoked_sessions (user_id, revoked_by, reason)
  VALUES (p_user_id, auth.uid(), 'account_banned');

  PERFORM public.log_audit_event(
    p_user_id, auth.uid(), 'user_banned', 'user', p_user_id::text,
    NULL, NULL, jsonb_build_object('account_status', 'banned'),
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('success', true, 'status', 'banned');
END;
$$;

-- ─── Reactivate user (admin only) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reactivate_user(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE public.profiles
  SET account_status    = 'active',
      suspended_at      = NULL,
      suspended_by      = NULL,
      suspension_reason = NULL
  WHERE id = p_user_id;

  PERFORM public.log_audit_event(
    p_user_id, auth.uid(), 'user_reactivated', 'user', p_user_id::text,
    NULL, jsonb_build_object('account_status', 'suspended_or_banned'),
    jsonb_build_object('account_status', 'active'), NULL
  );

  RETURN jsonb_build_object('success', true, 'status', 'active');
END;
$$;

-- ─── Admin assign super admin ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_assign_super_admin(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  UPDATE public.profiles SET role = 'admin' WHERE id = p_user_id;

  PERFORM public.log_audit_event(
    p_user_id, auth.uid(), 'super_admin_assigned', 'user', p_user_id::text,
    NULL, NULL, jsonb_build_object('role', 'admin'), NULL
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── Remove super admin ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_remove_super_admin(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove your own admin role';
  END IF;

  UPDATE public.user_roles SET role = 'user' WHERE user_id = p_user_id;
  UPDATE public.profiles SET role = 'user' WHERE id = p_user_id;

  PERFORM public.log_audit_event(
    p_user_id, auth.uid(), 'super_admin_removed', 'user', p_user_id::text,
    NULL, jsonb_build_object('role', 'admin'), jsonb_build_object('role', 'user'), NULL
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── Admin overview query ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_users(
  p_limit  integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text    DEFAULT NULL
)
RETURNS TABLE (
  id              uuid,
  full_name       text,
  email_encrypted text,
  phone_encrypted text,
  role            app_role,
  kyc_status      text,
  account_status  text,
  onboarding_done boolean,
  wing_id         text,
  created_at      timestamptz,
  last_sign_in_at timestamptz
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    p.id,
    p.full_name,
    p.email_encrypted,
    p.phone_encrypted,
    COALESCE(ur.role, 'user'::app_role),
    p.kyc_status,
    p.account_status,
    p.onboarding_completed,
    p.wing_id,
    p.created_at,
    au.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  LEFT JOIN auth.users au        ON au.id = p.id
  WHERE
    public.has_role(auth.uid(), 'admin')
    AND (
      p_search IS NULL
      OR p.full_name ILIKE '%' || p_search || '%'
      OR p.wing_id   ILIKE '%' || p_search || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;
