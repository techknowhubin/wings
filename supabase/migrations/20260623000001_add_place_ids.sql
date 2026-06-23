ALTER TABLE public.cab_bookings 
  ADD COLUMN IF NOT EXISTS pickup_place_id TEXT,
  ADD COLUMN IF NOT EXISTS drop_place_id TEXT;
