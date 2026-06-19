-- Alter platform_settings table to add booking restriction columns
ALTER TABLE public.platform_settings
ADD COLUMN IF NOT EXISTS same_day_restrictions_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS min_advance_hours INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS available_time_slots TEXT[] NOT NULL DEFAULT '{"00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "03:30", "04:00", "04:30", "05:00", "05:30", "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30"}',
ADD COLUMN IF NOT EXISTS blocked_time_slots TEXT[] NOT NULL DEFAULT '{}';

-- Alter cab_bookings table to add return_date column
ALTER TABLE public.cab_bookings
ADD COLUMN IF NOT EXISTS return_date TIMESTAMP WITH TIME ZONE;

-- Trigger function for validating cab booking time restrictions BEFORE INSERT or UPDATE
CREATE OR REPLACE FUNCTION public.validate_cab_booking_time()
RETURNS TRIGGER AS $$
DECLARE
  settings RECORD;
  travel_time_str TEXT;
  advance_interval INTERVAL;
  ist_now TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Fetch settings
  SELECT * INTO settings FROM public.platform_settings LIMIT 1;
  IF NOT FOUND THEN
    -- Fall back if settings row doesn't exist yet
    RETURN NEW;
  END IF;

  -- 1. Parse time of day from travel_date (in IST)
  -- travel_date is TIMESTAMPTZ. We convert it to the time format 'HH24:MI' in IST
  travel_time_str := to_char(NEW.travel_date AT TIME ZONE 'Asia/Kolkata', 'HH24:MI');

  -- Get current time in IST
  ist_now := now() AT TIME ZONE 'Asia/Kolkata';

  -- 2. Check same-day restrictions
  IF settings.same_day_restrictions_enabled THEN
    -- If the travel date is today (Asia/Kolkata timezone)
    IF (NEW.travel_date AT TIME ZONE 'Asia/Kolkata')::DATE = ist_now::DATE THEN
      -- Must be in the future
      IF NEW.travel_date <= now() THEN
        RAISE EXCEPTION 'Same-day bookings must be in the future.';
      END IF;

      -- Must satisfy minimum advance booking hours
      advance_interval := (settings.min_advance_hours || ' hours')::INTERVAL;
      IF NEW.travel_date < (now() + advance_interval) THEN
        RAISE EXCEPTION 'Same-day bookings require at least % hours advance notice.', settings.min_advance_hours;
      END IF;
    END IF;
  END IF;

  -- 3. Check if travel_date is in the past globally
  IF NEW.travel_date <= now() - INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'Cannot book a ride in the past.';
  END IF;

  -- 4. Check available time slots (if configured/restricted)
  IF array_length(settings.available_time_slots, 1) > 0 THEN
    IF NOT (travel_time_str = ANY(settings.available_time_slots)) THEN
      RAISE EXCEPTION 'Selected pickup time % is not within available time slots.', travel_time_str;
    END IF;
  END IF;

  -- 5. Check blocked time slots
  IF array_length(settings.blocked_time_slots, 1) > 0 THEN
    IF travel_time_str = ANY(settings.blocked_time_slots) THEN
      RAISE EXCEPTION 'Selected pickup time % has been blocked by the administrator.', travel_time_str;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on cab_bookings
DROP TRIGGER IF EXISTS trg_validate_cab_booking_time ON public.cab_bookings;
CREATE TRIGGER trg_validate_cab_booking_time
BEFORE INSERT OR UPDATE ON public.cab_bookings
FOR EACH ROW
EXECUTE FUNCTION public.validate_cab_booking_time();
