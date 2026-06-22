-- Update existing cancelled cab_bookings that were failed payments to 'failed' status
UPDATE public.cab_bookings
SET booking_status = 'failed'
WHERE booking_status = 'cancelled'
  AND payment_status = 'failed';
