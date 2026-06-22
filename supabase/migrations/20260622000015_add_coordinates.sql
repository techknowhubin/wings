-- Remove map_url and add coordinate columns
ALTER TABLE public.cab_bookings DROP COLUMN IF EXISTS map_url;

ALTER TABLE public.cab_bookings 
  ADD COLUMN IF NOT EXISTS pickup_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS pickup_longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS drop_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS drop_longitude NUMERIC;
