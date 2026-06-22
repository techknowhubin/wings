-- Add booking_source and booking_category columns to cab_bookings
ALTER TABLE public.cab_bookings
  ADD COLUMN IF NOT EXISTS booking_source text,
  ADD COLUMN IF NOT EXISTS booking_category text DEFAULT 'cab';

-- Backfill booking_source based on existing booking_type and route
-- Airport Transfer bookings
UPDATE public.cab_bookings
SET booking_source = 'airport_transfer', booking_category = 'cab'
WHERE booking_source IS NULL
  AND (
    booking_type ILIKE '%airport%'
    OR pickup_location ILIKE '%airport%'
    OR drop_location ILIKE '%airport%'
  );

-- 4HRS Local bookings
UPDATE public.cab_bookings
SET booking_source = 'local_4hrs', booking_category = 'cab'
WHERE booking_source IS NULL
  AND (booking_type ILIKE '%4 hour%' OR booking_type ILIKE '%4hrs%' OR booking_type ILIKE '%4 hours%');

-- 8HRS Local bookings
UPDATE public.cab_bookings
SET booking_source = 'local_8hrs', booking_category = 'cab'
WHERE booking_source IS NULL
  AND (booking_type ILIKE '%8 hour%' OR booking_type ILIKE '%8hrs%' OR booking_type ILIKE '%8 hours%');

-- Outstation bookings
UPDATE public.cab_bookings
SET booking_source = 'outstation_cab', booking_category = 'cab'
WHERE booking_source IS NULL
  AND (booking_type ILIKE '%outstation%');

-- Any remaining NULL booking_source (unknown) - classify by route
-- If drop or pickup mentions airport, it's airport transfer
UPDATE public.cab_bookings
SET booking_source = 'airport_transfer', booking_category = 'cab'
WHERE booking_source IS NULL
  AND (drop_location ILIKE '%airport%' OR pickup_location ILIKE '%airport%');

-- All remaining unknown bookings default to outstation (legacy)
UPDATE public.cab_bookings
SET booking_source = 'outstation_cab', booking_category = 'cab'
WHERE booking_source IS NULL;

-- Add index for fast filtering
CREATE INDEX IF NOT EXISTS idx_cab_bookings_booking_source ON public.cab_bookings(booking_source);
CREATE INDEX IF NOT EXISTS idx_cab_bookings_hub_partner_id ON public.cab_bookings(hub_partner_id);
