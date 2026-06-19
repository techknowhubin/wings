-- Fix: booked_seats should only count travellers from CONFIRMED or COMPLETED bookings.
-- Pending bookings (payment not yet received) must not consume capacity.

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
          AND LOWER(pb.booking_status) IN ('confirmed', 'completed')
      )
    WHERE id = v_package_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
          AND LOWER(pb.booking_status) IN ('confirmed', 'completed')
      )
    WHERE id = NEW.package_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalculate for all packages with the corrected logic
UPDATE public.tour_packages tp
SET booked_seats = (
  SELECT COUNT(pt.id)
  FROM public.package_travellers pt
  JOIN public.package_bookings pb ON pt.booking_id = pb.id
  WHERE pb.package_id = tp.id
    AND LOWER(pb.booking_status) IN ('confirmed', 'completed')
);
