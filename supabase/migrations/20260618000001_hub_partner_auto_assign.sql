-- 1. Fix foreign key constraint for hub_partner_id in cab_bookings
ALTER TABLE public.cab_bookings
  DROP CONSTRAINT IF EXISTS cab_bookings_hub_partner_id_fkey;

ALTER TABLE public.cab_bookings
  ADD CONSTRAINT cab_bookings_hub_partner_id_fkey
  FOREIGN KEY (hub_partner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Auto-assignment Trigger
CREATE OR REPLACE FUNCTION public.auto_assign_cab_booking()
RETURNS TRIGGER AS $$
DECLARE
  hub_id uuid;
BEGIN
  -- Try to find an exact match on State, District, and Area
  SELECT id INTO hub_id
  FROM public.profiles
  WHERE role = 'hub_partner'
    AND account_status = 'active'
    AND assigned_state = NEW.state
    AND assigned_district = NEW.assigned_district
    AND assigned_area = NEW.assigned_area
  LIMIT 1;

  -- If no exact match, fallback to matching just State and District
  IF hub_id IS NULL THEN
    SELECT id INTO hub_id
    FROM public.profiles
    WHERE role = 'hub_partner'
      AND account_status = 'active'
      AND assigned_state = NEW.state
      AND assigned_district = NEW.assigned_district
    LIMIT 1;
  END IF;

  IF hub_id IS NOT NULL THEN
    NEW.hub_partner_id = hub_id;
    NEW.assignment_status = 'Assigned';
  ELSE
    NEW.assignment_status = 'Awaiting Hub Partner Assignment';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_assign_cab_booking ON public.cab_bookings;
CREATE TRIGGER trg_auto_assign_cab_booking
BEFORE INSERT ON public.cab_bookings
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_cab_booking();

-- 3. Notifications Trigger
CREATE OR REPLACE FUNCTION public.notify_hub_partner_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify Hub Partner
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    NEW.hub_partner_id,
    'New Cab Booking Assigned',
    'A new outstation cab booking (' || NEW.pickup_location || ' to ' || NEW.drop_location || ') has been assigned to you.',
    'booking',
    '/hubpartner/bookings'
  );

  -- Notify Admins
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT user_id, 'Cab Booking Assigned', 'Cab booking assigned to Hub Partner.', 'system', '/admin/bookings'
  FROM public.user_roles WHERE role = 'admin';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_hub_partner_assignment_insert ON public.cab_bookings;
CREATE TRIGGER trg_notify_hub_partner_assignment_insert
AFTER INSERT ON public.cab_bookings
FOR EACH ROW
WHEN (NEW.hub_partner_id IS NOT NULL)
EXECUTE FUNCTION public.notify_hub_partner_assignment();

DROP TRIGGER IF EXISTS trg_notify_hub_partner_assignment_update ON public.cab_bookings;
CREATE TRIGGER trg_notify_hub_partner_assignment_update
AFTER UPDATE ON public.cab_bookings
FOR EACH ROW
WHEN (OLD.hub_partner_id IS DISTINCT FROM NEW.hub_partner_id AND NEW.hub_partner_id IS NOT NULL)
EXECUTE FUNCTION public.notify_hub_partner_assignment();
