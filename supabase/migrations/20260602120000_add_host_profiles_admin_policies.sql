-- RLS policies for host_profiles to allow admins full management access
-- This ensures admins can view and update onboarding_status of hosts

DROP POLICY IF EXISTS "Admins can view all host profiles" ON public.host_profiles;
CREATE POLICY "Admins can view all host profiles"
  ON public.host_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all host profiles" ON public.host_profiles;
CREATE POLICY "Admins can update all host profiles"
  ON public.host_profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert all host profiles" ON public.host_profiles;
CREATE POLICY "Admins can insert all host profiles"
  ON public.host_profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete all host profiles" ON public.host_profiles;
CREATE POLICY "Admins can delete all host profiles"
  ON public.host_profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
