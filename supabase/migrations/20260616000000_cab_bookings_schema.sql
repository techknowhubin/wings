CREATE TABLE IF NOT EXISTS public.cab_bookings (
  booking_id UUID PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  traveller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  hub_partner_id UUID REFERENCES public.hubs(id) ON DELETE SET NULL,
  state TEXT,
  pickup_location TEXT,
  drop_location TEXT,
  travel_date TIMESTAMP WITH TIME ZONE,
  cab_type TEXT,
  fare_amount NUMERIC(10,2),
  payment_id TEXT,
  payment_status TEXT,
  booking_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE public.cab_bookings ENABLE ROW LEVEL SECURITY;

-- Admins can read all cab bookings
CREATE POLICY "Admins can read cab bookings" ON public.cab_bookings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Hub partners can read cab bookings (hub_partner_id = their user id)
CREATE POLICY "Hub partners can read cab bookings in assigned state" ON public.cab_bookings
  FOR SELECT TO authenticated
  USING (hub_partner_id = auth.uid());

-- Host can read their own cab bookings
CREATE POLICY "Hosts can read own cab bookings" ON public.cab_bookings
  FOR SELECT TO authenticated
  USING (host_id = auth.uid());

-- Traveller can read their own cab bookings
CREATE POLICY "Travellers can read own cab bookings" ON public.cab_bookings
  FOR SELECT TO authenticated
  USING (traveller_id = auth.uid());

-- Authenticated users can insert cab bookings (during checkout)
CREATE POLICY "Users can insert cab bookings" ON public.cab_bookings
  FOR INSERT TO authenticated
  WITH CHECK (traveller_id = auth.uid() OR EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Trigger to sync payment_status, booking_status and payment_id from bookings table
CREATE OR REPLACE FUNCTION public.sync_cab_booking_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.listing_type = 'car' OR NEW.listing_type = 'bike' OR NEW.listing_type = 'vehicle' THEN
    UPDATE public.cab_bookings
    SET payment_status = NEW.payment_status,
        booking_status = NEW.booking_status,
        payment_id = NEW.transaction_id
    WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_cab_booking_status ON public.bookings;
CREATE TRIGGER trg_sync_cab_booking_status
AFTER UPDATE ON public.bookings
FOR EACH ROW
WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status OR OLD.booking_status IS DISTINCT FROM NEW.booking_status)
EXECUTE FUNCTION public.sync_cab_booking_status();
