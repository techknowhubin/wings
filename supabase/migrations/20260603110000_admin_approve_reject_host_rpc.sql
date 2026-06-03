-- Create functions for admin host approval and rejection

CREATE OR REPLACE FUNCTION public.admin_approve_host(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized: admin role required';
  END IF;

  -- Upsert onboarding status in host_profiles
  INSERT INTO public.host_profiles (id, onboarding_status, updated_at)
  VALUES (target_user_id, 'approved', now())
  ON CONFLICT (id) DO UPDATE
  SET onboarding_status = 'approved', updated_at = now();

  UPDATE public.profiles
  SET kyc_status = 'approved', updated_at = now()
  WHERE id = target_user_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_host(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reject_host(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized: admin role required';
  END IF;

  -- Upsert onboarding status in host_profiles
  INSERT INTO public.host_profiles (id, onboarding_status, updated_at)
  VALUES (target_user_id, 'rejected', now())
  ON CONFLICT (id) DO UPDATE
  SET onboarding_status = 'rejected', updated_at = now();

  UPDATE public.profiles
  SET kyc_status = 'rejected', updated_at = now()
  WHERE id = target_user_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reject_host(UUID) TO authenticated;
