-- 1. Add booked_seats counter and payment_id to package_bookings

ALTER TABLE public.tour_packages
  ADD COLUMN IF NOT EXISTS booked_seats INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.package_bookings
  ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- 2. Backfill booked_seats from existing traveller records
UPDATE public.tour_packages tp
SET booked_seats = (
  SELECT COUNT(pt.id)
  FROM public.package_travellers pt
  JOIN public.package_bookings pb ON pt.booking_id = pb.id
  WHERE pb.package_id = tp.id
    AND LOWER(pb.booking_status) != 'cancelled'
);

-- 3. Trigger: recalculate booked_seats whenever a package_traveller row is inserted or deleted
CREATE OR REPLACE FUNCTION public.sync_package_booked_seats()
RETURNS TRIGGER AS $$
DECLARE
  v_package_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT package_id INTO v_package_id FROM public.package_bookings WHERE id = OLD.booking_id;
  ELSE
    SELECT package_id INTO v_package_id FROM public.package_bookings WHERE id = NEW.booking_id;
  END IF;

  IF v_package_id IS NOT NULL THEN
    UPDATE public.tour_packages SET
      booked_seats = (
        SELECT COUNT(pt.id)
        FROM public.package_travellers pt
        JOIN public.package_bookings pb ON pt.booking_id = pb.id
        WHERE pb.package_id = v_package_id
          AND LOWER(pb.booking_status) != 'cancelled'
      )
    WHERE id = v_package_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_pkg_booked_seats ON public.package_travellers;
CREATE TRIGGER trg_sync_pkg_booked_seats
  AFTER INSERT OR DELETE ON public.package_travellers
  FOR EACH ROW EXECUTE FUNCTION public.sync_package_booked_seats();

-- 4. Trigger: recalculate when a booking's status changes (e.g. cancellation)
CREATE OR REPLACE FUNCTION public.sync_booked_seats_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.booking_status IS DISTINCT FROM NEW.booking_status AND NEW.package_id IS NOT NULL THEN
    UPDATE public.tour_packages SET
      booked_seats = (
        SELECT COUNT(pt.id)
        FROM public.package_travellers pt
        JOIN public.package_bookings pb ON pt.booking_id = pb.id
        WHERE pb.package_id = NEW.package_id
          AND LOWER(pb.booking_status) != 'cancelled'
      )
    WHERE id = NEW.package_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booked_seats_on_cancel ON public.package_bookings;
CREATE TRIGGER trg_booked_seats_on_cancel
  AFTER UPDATE ON public.package_bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_booked_seats_on_status_change();
