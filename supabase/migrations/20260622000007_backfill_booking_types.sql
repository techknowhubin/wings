-- Backfill booking_type for records where it's NULL
-- Airport bookings: pickup or drop contains 'Airport'
UPDATE public.cab_bookings
SET booking_type = 'Airport Transfer'
WHERE booking_type IS NULL
  AND (pickup_location ILIKE '%airport%' OR drop_location ILIKE '%airport%');

-- Remaining NULL booking_types: mark as 'Outstation Cab' (legacy)
UPDATE public.cab_bookings
SET booking_type = 'Outstation Cab'
WHERE booking_type IS NULL;
