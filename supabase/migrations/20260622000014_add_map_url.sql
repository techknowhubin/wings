-- Add map_url column to cab_bookings to store exact Google Maps location links
ALTER TABLE public.cab_bookings ADD COLUMN IF NOT EXISTS map_url TEXT;
