-- Recreate the notify trigger to use the exact formatting requested
CREATE OR REPLACE FUNCTION public.notify_hub_partner_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_title TEXT;
  v_hub_title TEXT;
  v_admin_msg TEXT;
  v_hub_msg TEXT;
  v_booking_short_id TEXT;
  v_cust_name TEXT;
BEGIN
  v_booking_short_id := 'XPA-' || UPPER(SUBSTRING(NEW.booking_id::text, 1, 6));
  v_cust_name := COALESCE(NEW.customer_name, NEW.traveller_name, 'Traveller');

  v_admin_title := '🚕 New Cab Booking Received';
  v_admin_msg := 'Traveller: ' || v_cust_name || E'\n' ||
                 'Booking ID: ' || v_booking_short_id || E'\n\n' ||
                 'Pickup:' || E'\n' || COALESCE(NEW.pickup_location, 'N/A') || E'\n\n' ||
                 'View Location' || E'\n' ||
                 'Assign Driver';

  v_hub_title := '🚕 New Cab Booking Received';
  v_hub_msg := 'Traveller: ' || v_cust_name || E'\n' ||
               'Booking ID: ' || v_booking_short_id || E'\n\n' ||
               'Pickup:' || E'\n' || COALESCE(NEW.pickup_location, 'N/A') || E'\n\n' ||
               'View Location' || E'\n' ||
               'Assign Driver';

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


-- Driver Notification Trigger (Fires when driver is assigned)
CREATE OR REPLACE FUNCTION public.notify_cab_driver_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_title TEXT;
  v_driver_msg TEXT;
  v_booking_short_id TEXT;
  v_cust_name TEXT;
  v_cust_phone TEXT;
BEGIN
  IF NEW.driver_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.driver_id IS DISTINCT FROM NEW.driver_id) THEN
    v_booking_short_id := 'XPA-' || UPPER(SUBSTRING(NEW.booking_id::text, 1, 6));
    v_cust_name := COALESCE(NEW.customer_name, NEW.traveller_name, 'Traveller');
    v_cust_phone := COALESCE(NEW.customer_phone, NEW.traveller_phone, 'XXXXXXXXXX');

    v_driver_title := '🚗 New Ride Assigned';
    v_driver_msg := 'Booking ID: ' || v_booking_short_id || E'\n\n' ||
                    'Pickup:' || E'\n' || COALESCE(NEW.pickup_location, 'N/A') || E'\n\n' ||
                    'Customer:' || E'\n' || v_cust_name || E'\n\n' ||
                    'Phone:' || E'\n' || v_cust_phone || E'\n\n' ||
                    'View Route';

    -- Assuming hub_drivers have an associated profile/user_id for PWA notifications, 
    -- if driver_id in cab_bookings refers to hub_drivers.id, and they can login.
    -- (In many cases, driver_id in notifications must match auth.users).
    -- If driver_id is a UUID, it will be inserted here.
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
