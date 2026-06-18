-- ============================================================
-- Fix Hub Partner RLS and functions
-- ============================================================

-- 1. Fix get_assigned_state() which was crashing because it referenced a non-existent 'role' column on 'profiles'.
CREATE OR REPLACE FUNCTION public.get_assigned_state()
RETURNS text AS $$
  SELECT assigned_state FROM public.profiles 
  WHERE id = auth.uid() 
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'hub_partner') 
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Allow Hub Partners to view user_roles (required to list hosts and travellers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_roles' 
      AND policyname = 'Hub Partners can view user roles'
  ) THEN
    CREATE POLICY "Hub Partners can view user roles"
      ON public.user_roles FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'hub_partner'));
  END IF;
END$$;
