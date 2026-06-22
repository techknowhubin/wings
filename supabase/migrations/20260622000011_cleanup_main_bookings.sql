-- Also update the main bookings table for these abandoned sessions
-- We set booking_status to 'cancelled' because 'failed' is not in the enum
UPDATE public.bookings
SET payment_status = 'failed',
    booking_status = 'cancelled'
WHERE payment_status::text = 'pending'
  AND created_at < NOW() - INTERVAL '1 hours'
  AND listing_type::text = 'vehicle';
