-- 2. Now update cab_bookings
UPDATE public.cab_bookings
SET payment_status = 'failed',
    booking_status = 'failed'
WHERE payment_status = 'pending';

-- 3. Now update bookings
UPDATE public.bookings b
SET payment_status = 'failed',
    booking_status = 'cancelled'
FROM public.cab_bookings cb
WHERE b.id = cb.booking_id
  AND b.payment_status::text = 'pending';
