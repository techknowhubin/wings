-- Store the package-type breakdown (adult/child/single/twin qty+price) per booking.
-- Used by hub partner dashboard to show what was actually selected.
ALTER TABLE public.package_bookings
  ADD COLUMN IF NOT EXISTS booking_details JSONB;
