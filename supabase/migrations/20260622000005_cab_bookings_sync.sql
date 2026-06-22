-- Backfill assigned_hub_uuid
UPDATE public.cab_bookings cb
SET assigned_hub_uuid = h.uuid
FROM public.hubs h
WHERE cb.hub_partner_id = h.id AND cb.assigned_hub_uuid IS NULL;

-- Trigger to auto-populate assigned_hub_uuid on INSERT or UPDATE
CREATE OR REPLACE FUNCTION public.sync_hub_uuid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hub_partner_id IS NOT NULL THEN
    SELECT uuid INTO NEW.assigned_hub_uuid FROM public.hubs WHERE id = NEW.hub_partner_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_hub_uuid ON public.cab_bookings;
CREATE TRIGGER trg_sync_hub_uuid
BEFORE INSERT OR UPDATE ON public.cab_bookings
FOR EACH ROW
EXECUTE FUNCTION public.sync_hub_uuid();

-- Trigger to sync payment_status from bookings to cab_bookings
CREATE OR REPLACE FUNCTION public.sync_cab_booking_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status != OLD.payment_status THEN
    UPDATE public.cab_bookings 
    SET payment_status = NEW.payment_status::text
    WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_cab_booking_payment_status ON public.bookings;
CREATE TRIGGER trg_sync_cab_booking_payment_status
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.sync_cab_booking_payment_status();

-- Backfill payment_status
UPDATE public.cab_bookings cb
SET payment_status = b.payment_status::text
FROM public.bookings b
WHERE cb.booking_id = b.id AND cb.payment_status != b.payment_status::text;
