-- Create Hubs Table
CREATE TABLE IF NOT EXISTS public.hubs (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  uuid uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  hub_name text NOT NULL,
  owner_name text NOT NULL,
  email text,
  mobile text NOT NULL,
  district text NOT NULL,
  area text,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.hubs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can do everything on hubs" ON public.hubs;
CREATE POLICY "Admins can do everything on hubs" ON public.hubs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Hub partners can view their own hub" ON public.hubs;
CREATE POLICY "Hub partners can view their own hub" ON public.hubs FOR SELECT USING (
  id = auth.uid()
);
DROP POLICY IF EXISTS "Hub partners can update their own hub" ON public.hubs;
CREATE POLICY "Hub partners can update their own hub" ON public.hubs FOR UPDATE USING (
  id = auth.uid()
);

-- Create Hub Drivers Table
CREATE TABLE IF NOT EXISTS public.hub_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_uuid uuid REFERENCES public.hubs(uuid) ON DELETE CASCADE,
  driver_name text NOT NULL,
  mobile text NOT NULL,
  license_number text,
  vehicle_assigned text,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.hub_drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can access all hub_drivers" ON public.hub_drivers;
CREATE POLICY "Admins can access all hub_drivers" ON public.hub_drivers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Hub partners manage their own drivers" ON public.hub_drivers;
CREATE POLICY "Hub partners manage their own drivers" ON public.hub_drivers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.hubs WHERE uuid = hub_uuid AND id = auth.uid())
);

-- Create Hub Vehicles Table
CREATE TABLE IF NOT EXISTS public.hub_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_uuid uuid REFERENCES public.hubs(uuid) ON DELETE CASCADE,
  vehicle_name text NOT NULL,
  vehicle_type text NOT NULL,
  vehicle_number text NOT NULL,
  seating_capacity integer,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.hub_vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can access all hub_vehicles" ON public.hub_vehicles;
CREATE POLICY "Admins can access all hub_vehicles" ON public.hub_vehicles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "Hub partners manage their own vehicles" ON public.hub_vehicles;
CREATE POLICY "Hub partners manage their own vehicles" ON public.hub_vehicles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.hubs WHERE uuid = hub_uuid AND id = auth.uid())
);


