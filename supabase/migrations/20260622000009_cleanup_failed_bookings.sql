-- Mark all cab_bookings that have payment_status = 'pending' but
-- the corresponding booking in bookings table has payment_status = 'failed' or 'cancelled'
UPDATE public.cab_bookings cb
SET payment_status = 'failed',
    booking_status = 'cancelled'
FROM public.bookings b
WHERE cb.booking_id = b.id
  AND b.payment_status::text IN ('failed', 'cancelled')
  AND cb.payment_status = 'pending';

-- Mark cab_bookings older than 2 hours that are still 'pending' as cancelled
-- (these are abandoned sessions where user closed the browser)
UPDATE public.cab_bookings
SET payment_status = 'failed',
    booking_status = 'cancelled'
WHERE payment_status = 'pending'
  AND created_at < NOW() - INTERVAL '2 hours';
