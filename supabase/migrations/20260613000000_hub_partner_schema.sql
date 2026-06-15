-- ============================================================
-- Phase 11: State Hub Partner Schema & Roles
-- ============================================================

-- 1. Add 'hub_partner' role to app_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.app_role'::regtype
    AND enumlabel = 'hub_partner'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'hub_partner';
  END IF;
END$$;

-- 2. Add 'assigned_state' to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_state text;

-- 3. Add 'state' and 'city' to all listing tables
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN SELECT unnest(ARRAY['stays', 'hotels', 'resorts', 'cars', 'bikes', 'experiences'])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS state text;', table_name);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS city text;', table_name);
  END LOOP;
END$$;

-- 4. Add 'state' to bookings for easy RLS & reporting
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS state text;

-- 5. RLS Policies for Hub Partners

-- Helper function to get current user's assigned state
CREATE OR REPLACE FUNCTION public.get_assigned_state()
RETURNS text AS $$
  SELECT assigned_state FROM public.profiles WHERE id = auth.uid() AND role = 'hub_partner' LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Profiles: Hub Partners can view profiles that belong to their state (if profiles have a state)
-- Wait, the prompt says "View hosts in assigned state" and "Traveller Management... assigned state".
-- The profiles table has a 'state' column from the initial migration.
DROP POLICY IF EXISTS "Hub Partners can view profiles in their state" ON public.profiles;
CREATE POLICY "Hub Partners can view profiles in their state"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hub_partner') AND state = public.get_assigned_state()
  );

-- Stays
DROP POLICY IF EXISTS "Hub Partners can view stays in their state" ON public.stays;
CREATE POLICY "Hub Partners can view stays in their state"
  ON public.stays FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hub_partner') AND state = public.get_assigned_state()
  );

DROP POLICY IF EXISTS "Hub Partners can update stays in their state" ON public.stays;
CREATE POLICY "Hub Partners can update stays in their state"
  ON public.stays FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'hub_partner') AND state = public.get_assigned_state()
  );

-- Hotels
DROP POLICY IF EXISTS "Hub Partners can view hotels in their state" ON public.hotels;
CREATE POLICY "Hub Partners can view hotels in their state"
  ON public.hotels FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hub_partner') AND state = public.get_assigned_state()
  );

DROP POLICY IF EXISTS "Hub Partners can update hotels in their state" ON public.hotels;
CREATE POLICY "Hub Partners can update hotels in their state"
  ON public.hotels FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'hub_partner') AND state = public.get_assigned_state()
  );

-- Resorts
DROP POLICY IF EXISTS "Hub Partners can view resorts in their state" ON public.resorts;
CREATE POLICY "Hub Partners can view resorts in their state"
  ON public.resorts FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hub_partner') AND state = public.get_assigned_state()
  );

DROP POLICY IF EXISTS "Hub Partners can update resorts in their state" ON public.resorts;
CREATE POLICY "Hub Partners can update resorts in their state"
  ON public.resorts FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'hub_partner') AND state = public.get_assigned_state()
  );

-- Cars
DROP POLICY IF EXISTS "Hub Partners can view cars in their state" ON public.cars;
CREATE POLICY "Hub Partners can view cars in their state"
  ON public.cars FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hub_partner') AND state = public.get_assigned_state()
  );

DROP POLICY IF EXISTS "Hub Partners can update cars in their state" ON public.cars;
CREATE POLICY "Hub Partners can update cars in their state"
  ON public.cars FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'hub_partner') AND state = public.get_assigned_state()
  );

-- Bikes
DROP POLICY IF EXISTS "Hub Partners can view bikes in their state" ON public.bikes;
CREATE POLICY "Hub Partners can view bikes in their state"
  ON public.bikes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hub_partner') AND state = public.get_assigned_state()
  );

DROP POLICY IF EXISTS "Hub Partners can update bikes in their state" ON public.bikes;
CREATE POLICY "Hub Partners can update bikes in their state"
  ON public.bikes FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'hub_partner') AND state = public.get_assigned_state()
  );

-- Experiences
DROP POLICY IF EXISTS "Hub Partners can view experiences in their state" ON public.experiences;
CREATE POLICY "Hub Partners can view experiences in their state"
  ON public.experiences FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hub_partner') AND state = public.get_assigned_state()
  );

DROP POLICY IF EXISTS "Hub Partners can update experiences in their state" ON public.experiences;
CREATE POLICY "Hub Partners can update experiences in their state"
  ON public.experiences FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'hub_partner') AND state = public.get_assigned_state()
  );

-- Bookings
DROP POLICY IF EXISTS "Hub Partners can view bookings in their state" ON public.bookings;
CREATE POLICY "Hub Partners can view bookings in their state"
  ON public.bookings FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hub_partner') AND state = public.get_assigned_state()
  );

-- Note: Hub partners cannot modify bookings (as per prompt "Cannot: Cancel completed bookings, Modify payment records")
-- If they need to resolve disputes, we may need a specific ticket/dispute table or strict update policy on booking status.
-- For now, read-only is safe.

