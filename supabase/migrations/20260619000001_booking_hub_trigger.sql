-- Auto-fill hub_id on package_bookings INSERT.
-- Regular users cannot read package_assignments (RLS blocks it), so the frontend
-- cannot look up hub_id itself. This SECURITY DEFINER trigger resolves the published
-- hub for the package and stamps it on the booking row before INSERT completes.

CREATE OR REPLACE FUNCTION public.set_booking_hub_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.hub_id IS NULL AND NEW.package_id IS NOT NULL THEN
    SELECT hub_id INTO NEW.hub_id
    FROM public.package_assignments
    WHERE package_id = NEW.package_id
      AND status = 'published'
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_booking_hub_id ON public.package_bookings;
CREATE TRIGGER trg_set_booking_hub_id
  BEFORE INSERT ON public.package_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_booking_hub_id();
