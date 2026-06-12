-- ============================================================
-- Redefine Admin RPC Functions to allow call from service_role
-- and accept optional p_actor_id parameter to maintain audit logs.
-- ============================================================

-- 1. admin_change_user_role
CREATE OR REPLACE FUNCTION public.admin_change_user_role(
  p_target_user_id uuid,
  p_new_role        app_role,
  p_reason          text DEFAULT NULL,
  p_actor_id        uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_old_role app_role;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  IF p_target_user_id = COALESCE(p_actor_id, auth.uid()) THEN
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

  -- Audit log
  PERFORM public.log_audit_event(
    p_target_user_id,
    COALESCE(p_actor_id, auth.uid()),
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

-- 2. admin_suspend_user
CREATE OR REPLACE FUNCTION public.admin_suspend_user(
  p_user_id uuid,
  p_reason  text DEFAULT 'Policy violation',
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE public.profiles
  SET account_status    = 'suspended',
      suspended_at      = now(),
      suspended_by      = COALESCE(p_actor_id, auth.uid()),
      suspension_reason = p_reason
  WHERE id = p_user_id;

  -- Revoke active sessions
  INSERT INTO public.revoked_sessions (user_id, revoked_by, reason)
  VALUES (p_user_id, COALESCE(p_actor_id, auth.uid()), 'account_suspended');

  PERFORM public.log_audit_event(
    p_user_id, COALESCE(p_actor_id, auth.uid()), 'user_suspended', 'user', p_user_id::text,
    NULL, NULL, jsonb_build_object('account_status', 'suspended'),
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('success', true, 'status', 'suspended');
END;
$$;

-- 3. admin_ban_user
CREATE OR REPLACE FUNCTION public.admin_ban_user(
  p_user_id uuid,
  p_reason  text DEFAULT 'Policy violation',
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE public.profiles
  SET account_status = 'banned',
      banned_at      = now(),
      banned_by      = COALESCE(p_actor_id, auth.uid()),
      ban_reason     = p_reason
  WHERE id = p_user_id;

  INSERT INTO public.revoked_sessions (user_id, revoked_by, reason)
  VALUES (p_user_id, COALESCE(p_actor_id, auth.uid()), 'account_banned');

  PERFORM public.log_audit_event(
    p_user_id, COALESCE(p_actor_id, auth.uid()), 'user_banned', 'user', p_user_id::text,
    NULL, NULL, jsonb_build_object('account_status', 'banned'),
    jsonb_build_object('reason', p_reason)
  );

  RETURN jsonb_build_object('success', true, 'status', 'banned');
END;
$$;

-- 4. admin_reactivate_user
CREATE OR REPLACE FUNCTION public.admin_reactivate_user(
  p_user_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  UPDATE public.profiles
  SET account_status    = 'active',
      suspended_at      = NULL,
      suspended_by      = NULL,
      suspension_reason = NULL
  WHERE id = p_user_id;

  PERFORM public.log_audit_event(
    p_user_id, COALESCE(p_actor_id, auth.uid()), 'user_reactivated', 'user', p_user_id::text,
    NULL, jsonb_build_object('account_status', 'suspended_or_banned'),
    jsonb_build_object('account_status', 'active'), NULL
  );

  RETURN jsonb_build_object('success', true, 'status', 'active');
END;
$$;

-- 5. admin_assign_super_admin
CREATE OR REPLACE FUNCTION public.admin_assign_super_admin(
  p_user_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  UPDATE public.profiles SET role = 'admin' WHERE id = p_user_id;

  PERFORM public.log_audit_event(
    p_user_id, COALESCE(p_actor_id, auth.uid()), 'super_admin_assigned', 'user', p_user_id::text,
    NULL, NULL, jsonb_build_object('role', 'admin'), NULL
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. admin_remove_super_admin
CREATE OR REPLACE FUNCTION public.admin_remove_super_admin(
  p_user_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  IF p_user_id = COALESCE(p_actor_id, auth.uid()) THEN
    RAISE EXCEPTION 'Cannot remove your own admin role';
  END IF;

  UPDATE public.user_roles SET role = 'user' WHERE user_id = p_user_id;
  UPDATE public.profiles SET role = 'user' WHERE id = p_user_id;

  PERFORM public.log_audit_event(
    p_user_id, COALESCE(p_actor_id, auth.uid()), 'super_admin_removed', 'user', p_user_id::text,
    NULL, jsonb_build_object('role', 'admin'), jsonb_build_object('role', 'user'), NULL
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. admin_delete_user_cascade
CREATE OR REPLACE FUNCTION public.admin_delete_user_cascade(
  p_user_id uuid,
  p_reason  text DEFAULT 'Admin action',
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_bookings_count integer;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  IF p_user_id = COALESCE(p_actor_id, auth.uid()) THEN
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
    COALESCE(p_actor_id, auth.uid()),
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

-- 8. revoke_user_sessions
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(
  p_user_id uuid,
  p_reason  text DEFAULT 'admin_action',
  p_actor_id uuid DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  INSERT INTO public.revoked_sessions (user_id, revoked_by, reason)
  VALUES (p_user_id, COALESCE(p_actor_id, auth.uid()), p_reason);
END;
$$;

-- 9. admin_get_security_stats
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
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
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
