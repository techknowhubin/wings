-- Allow travellers to update their own cab_bookings (needed for failure/retry status recording)
DROP POLICY IF EXISTS "Travellers can update own cab bookings" ON public.cab_bookings;
CREATE POLICY "Travellers can update own cab bookings" ON public.cab_bookings
  FOR UPDATE TO authenticated
  USING (traveller_id = auth.uid())
  WITH CHECK (traveller_id = auth.uid());

-- Allow hub partners to update cab bookings assigned to them (driver assignment, status updates)
DROP POLICY IF EXISTS "Hub partners can update assigned cab bookings" ON public.cab_bookings;
CREATE POLICY "Hub partners can update assigned cab bookings" ON public.cab_bookings
  FOR UPDATE TO authenticated
  USING (hub_partner_id = auth.uid())
  WITH CHECK (hub_partner_id = auth.uid());

