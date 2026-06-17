-- ============================================================
-- Phase: Hub Partner Routing & Distance
-- ============================================================

-- 1. Add assigned_district and assigned_area to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_district text,
  ADD COLUMN IF NOT EXISTS assigned_area text;

-- 2. Add routing and distance columns to cab_bookings
ALTER TABLE public.cab_bookings
  ADD COLUMN IF NOT EXISTS distance_km numeric(10,2),
  ADD COLUMN IF NOT EXISTS assigned_district text,
  ADD COLUMN IF NOT EXISTS assigned_area text,
  ADD COLUMN IF NOT EXISTS assignment_status text DEFAULT 'Awaiting Hub Partner Assignment';

-- 3. Update existing cab_bookings assignment status if null
UPDATE public.cab_bookings
SET assignment_status = 'Awaiting Hub Partner Assignment'
WHERE assignment_status IS NULL;
