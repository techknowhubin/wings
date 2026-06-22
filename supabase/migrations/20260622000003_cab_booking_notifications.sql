-- Add missing columns to cab_bookings
ALTER TABLE public.cab_bookings
  ADD COLUMN IF NOT EXISTS booking_type TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS pickup_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS pickup_longitude TEXT, -- Using TEXT for flexibility or NUMERIC
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS base_fare NUMERIC(10,2);

-- Update the auto assign trigger to not fail if columns are missing
-- Recreate the notify trigger to use the new formatting
CREATE OR REPLACE FUNCTION public.notify_hub_partner_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_title TEXT;
  v_hub_title TEXT;
  v_admin_msg TEXT;
  v_hub_msg TEXT;
  v_booking_short_id TEXT;
  v_booking_date TEXT;
  v_btype TEXT;
  v_cust_name TEXT;
BEGIN
  v_booking_short_id := 'XPA-' || UPPER(SUBSTRING(NEW.booking_id::text, 1, 6));
  
  IF NEW.travel_date IS NOT NULL THEN
    v_booking_date := to_char(NEW.travel_date AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY, HH:MI AM');
  ELSE
    v_booking_date := 'TBD';
  END IF;

  v_btype := COALESCE(NEW.booking_type, 'Outstation Cab');
  v_cust_name := COALESCE(NEW.customer_name, 'Traveller');

  v_admin_title := '🚕 New ' || v_btype || ' Received';
  v_admin_msg := 'Customer: ' || v_cust_name || E'\n' ||
                 'Vehicle: ' || COALESCE(NEW.cab_type, 'N/A') || E'\n' ||
                 'Pickup: ' || COALESCE(NEW.pickup_location, 'N/A') || E'\n' ||
                 'Drop: ' || COALESCE(NEW.drop_location, 'N/A') || E'\n' ||
                 'Amount: ₹' || COALESCE(NEW.fare_amount, 0) || E'\n' ||
                 'Booking ID: ' || v_booking_short_id || E'\n' ||
                 'Time: ' || v_booking_date;

  v_hub_title := '🚕 New Booking Assigned';
  v_hub_msg := 'Booking Type: ' || v_btype || E'\n' ||
               'Customer: ' || v_cust_name || E'\n' ||
               'Vehicle: ' || COALESCE(NEW.cab_type, 'N/A') || E'\n' ||
               'Pickup Location: ' || COALESCE(NEW.pickup_location, 'N/A') || E'\n' ||
               'Drop Location: ' || COALESCE(NEW.drop_location, 'N/A') || E'\n' ||
               'Amount: ₹' || COALESCE(NEW.fare_amount, 0);

  -- Notify Hub Partner if assigned
  IF NEW.hub_partner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, reference_id, reference_type)
    VALUES (
      NEW.hub_partner_id,
      v_hub_title,
      v_hub_msg,
      'booking',
      '/hubpartner/bookings',
      NEW.booking_id,
      'cab_booking'
    );
  END IF;

  -- Notify Admins only on INSERT to avoid spam on every update
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, reference_id, reference_type)
    SELECT user_id, v_admin_title, v_admin_msg, 'system', '/admin/bookings', NEW.booking_id, 'cab_booking'
    FROM public.user_roles WHERE role = 'admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers
DROP TRIGGER IF EXISTS trg_notify_hub_partner_assignment_insert ON public.cab_bookings;
CREATE TRIGGER trg_notify_hub_partner_assignment_insert
AFTER INSERT ON public.cab_bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_hub_partner_assignment();

DROP TRIGGER IF EXISTS trg_notify_hub_partner_assignment_update ON public.cab_bookings;
CREATE TRIGGER trg_notify_hub_partner_assignment_update
AFTER UPDATE ON public.cab_bookings
FOR EACH ROW
WHEN (OLD.hub_partner_id IS DISTINCT FROM NEW.hub_partner_id AND NEW.hub_partner_id IS NOT NULL)
EXECUTE FUNCTION public.notify_hub_partner_assignment();

-- Driver Notification Trigger (Fires when driver is assigned)
CREATE OR REPLACE FUNCTION public.notify_cab_driver_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_title TEXT;
  v_driver_msg TEXT;
BEGIN
  IF NEW.driver_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.driver_id IS DISTINCT FROM NEW.driver_id) THEN
    v_driver_title := '🚗 New Trip Assigned';
    v_driver_msg := 'Pickup: ' || COALESCE(NEW.pickup_location, 'N/A') || E'\n' ||
                    'Drop: ' || COALESCE(NEW.drop_location, 'N/A') || E'\n' ||
                    'Time: ' || to_char(NEW.travel_date AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY, HH:MI AM');

    INSERT INTO public.notifications (user_id, title, message, type, link, reference_id, reference_type)
    VALUES (
      NEW.driver_id,
      v_driver_title,
      v_driver_msg,
      'trip',
      '/driver/trips',
      NEW.booking_id,
      'cab_booking'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_cab_driver_assignment ON public.cab_bookings;
CREATE TRIGGER trg_notify_cab_driver_assignment
AFTER INSERT OR UPDATE ON public.cab_bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_cab_driver_assignment();

-- Update cab_bookings RLS to let drivers see their trips
CREATE POLICY "Drivers can read own cab bookings" ON public.cab_bookings
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());
