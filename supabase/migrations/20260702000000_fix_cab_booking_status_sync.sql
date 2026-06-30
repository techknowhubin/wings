-- Fix: cab_bookings.booking_status is never synced for listing_type = 'cab'
-- The original sync_cab_booking_status only covered 'car','bike','vehicle'.
-- The sync_cab_booking_payment_status only synced payment_status, not booking_status.
-- Both are updated here to cover 'cab' and sync booking_status as well.

-- 1. Replace the full-status sync function to include listing_type = 'cab'
CREATE OR REPLACE FUNCTION public.sync_cab_booking_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.listing_type IN ('car', 'bike', 'vehicle', 'cab') THEN
    UPDATE public.cab_bookings
    SET payment_status = NEW.payment_status,
        booking_status = NEW.booking_status,
        payment_id     = NEW.transaction_id
    WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Replace the payment-only sync function to also sync booking_status
CREATE OR REPLACE FUNCTION public.sync_cab_booking_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.booking_status IS DISTINCT FROM OLD.booking_status THEN
    UPDATE public.cab_bookings
    SET payment_status = NEW.payment_status::text,
        booking_status = NEW.booking_status::text
    WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill: sync booking_status for all existing cab_bookings that are out of date
UPDATE public.cab_bookings cb
SET payment_status = b.payment_status::text,
    booking_status = b.booking_status::text
FROM public.bookings b
WHERE cb.booking_id = b.id
  AND (
    cb.booking_status IS DISTINCT FROM b.booking_status::text
    OR cb.payment_status IS DISTINCT FROM b.payment_status::text
  );
