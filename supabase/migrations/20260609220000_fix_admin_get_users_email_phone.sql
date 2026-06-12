-- ============================================================
-- Fix admin_get_users: show email & phone even when encrypted
-- columns are not yet populated (legacy users).
--
-- Strategy:
--   email  → COALESCE(profiles.email_encrypted, auth.users.email)
--   phone  → COALESCE(profiles.phone_encrypted, profiles.phone)
--
-- The frontend EncryptedCell already handles both encrypted
-- ("gcm_" prefix) and plaintext strings.
-- ============================================================

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
    COALESCE(p.email_encrypted, au.email)  AS email_encrypted,
    COALESCE(p.phone_encrypted, p.phone)   AS phone_encrypted,
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
      OR au.email    ILIKE '%' || p_search || '%'
      OR p.phone     ILIKE '%' || p_search || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;
