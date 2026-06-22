CREATE OR REPLACE FUNCTION public.notify_traveller_cab_booking_update()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_msg TEXT;
  v_btype TEXT;
  v_driver_name TEXT;
BEGIN
  -- Only fire if the status changed
  IF TG_OP = 'UPDATE' AND OLD.trip_status IS NOT DISTINCT FROM NEW.trip_status AND OLD.booking_status IS NOT DISTINCT FROM NEW.booking_status THEN
    RETURN NEW;
  END IF;

  v_btype := COALESCE(NEW.booking_type, 'Outstation Cab');

  -- Booking Submitted (Fires on INSERT)
  IF TG_OP = 'INSERT' THEN
    v_title := 'Booking Submitted 🕒';
    v_msg := 'Your ' || v_btype || ' booking request has been received and is pending confirmation.';
    INSERT INTO public.notifications (user_id, title, message, type, link, reference_id, reference_type)
    VALUES (NEW.traveller_id, v_title, v_msg, 'booking', '/user/bookings', NEW.booking_id, 'cab_booking');
    RETURN NEW;
  END IF;

  -- Booking Accepted (Confirmed)
  IF NEW.booking_status = 'confirmed' AND OLD.booking_status != 'confirmed' THEN
    v_title := 'Booking Confirmed ✅';
    v_msg := 'Your ' || v_btype || ' booking has been confirmed by the Hub Partner.';
    INSERT INTO public.notifications (user_id, title, message, type, link, reference_id, reference_type)
    VALUES (NEW.traveller_id, v_title, v_msg, 'booking', '/user/bookings', NEW.booking_id, 'cab_booking');
  END IF;

  -- Driver Assigned
  IF NEW.trip_status = 'Driver Assigned' AND OLD.trip_status != 'Driver Assigned' THEN
    -- Try to fetch driver name
    SELECT full_name INTO v_driver_name FROM public.profiles WHERE id = NEW.driver_id;
    v_title := 'Driver Assigned 👨‍✈️';
    v_msg := 'Driver ' || COALESCE(v_driver_name, '') || ' has been assigned to your trip.';
    INSERT INTO public.notifications (user_id, title, message, type, link, reference_id, reference_type)
    VALUES (NEW.traveller_id, v_title, v_msg, 'booking', '/user/bookings', NEW.booking_id, 'cab_booking');
  END IF;

  -- Trip Started
  IF NEW.trip_status = 'Trip Started' AND OLD.trip_status != 'Trip Started' THEN
    v_title := 'Trip Started 🚗';
    v_msg := 'Your trip has started. Have a safe journey!';
    INSERT INTO public.notifications (user_id, title, message, type, link, reference_id, reference_type)
    VALUES (NEW.traveller_id, v_title, v_msg, 'trip', '/user/bookings', NEW.booking_id, 'cab_booking');
  END IF;

  -- Trip Completed
  IF NEW.trip_status = 'Trip Completed' AND OLD.trip_status != 'Trip Completed' THEN
    v_title := 'Trip Completed 🎉';
    v_msg := 'Your trip has been completed. Thank you for choosing Xplorwing!';
    INSERT INTO public.notifications (user_id, title, message, type, link, reference_id, reference_type)
    VALUES (NEW.traveller_id, v_title, v_msg, 'trip', '/user/bookings', NEW.booking_id, 'cab_booking');
  END IF;

  -- Booking Cancelled
  IF NEW.booking_status = 'cancelled' AND OLD.booking_status != 'cancelled' THEN
    v_title := 'Booking Cancelled ❌';
    v_msg := 'Your ' || v_btype || ' booking has been cancelled.';
    INSERT INTO public.notifications (user_id, title, message, type, link, reference_id, reference_type)
    VALUES (NEW.traveller_id, v_title, v_msg, 'booking', '/user/bookings', NEW.booking_id, 'cab_booking');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_traveller_cab_booking_update ON public.cab_bookings;
CREATE TRIGGER trg_notify_traveller_cab_booking_update
AFTER INSERT OR UPDATE ON public.cab_bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_traveller_cab_booking_update();
