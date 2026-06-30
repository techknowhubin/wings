-- ================================================================
-- Comprehensive cab_bookings column & policy catch-up migration
-- Safe to run multiple times (IF NOT EXISTS / OR REPLACE everywhere)
-- ================================================================

-- ── 1. Ensure all columns inserted by ConfirmAndPay exist ────────
ALTER TABLE public.cab_bookings
  ADD COLUMN IF NOT EXISTS distance_km          NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS return_date          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_hub_uuid    UUID REFERENCES public.hubs(uuid) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_district    TEXT,
  ADD COLUMN IF NOT EXISTS assigned_area        TEXT,
  ADD COLUMN IF NOT EXISTS assignment_status    TEXT DEFAULT 'Awaiting Hub Partner Assignment',
  ADD COLUMN IF NOT EXISTS driver_id            UUID,
  ADD COLUMN IF NOT EXISTS trip_status          TEXT DEFAULT 'Awaiting Assignment',
  ADD COLUMN IF NOT EXISTS service_type         TEXT DEFAULT 'Outstation Cab',
  ADD COLUMN IF NOT EXISTS base_amount          NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_fare            NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_percentage       NUMERIC(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount           NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS airport_parking_charge NUMERIC      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_type         TEXT,
  ADD COLUMN IF NOT EXISTS booking_source       TEXT,
  ADD COLUMN IF NOT EXISTS booking_category     TEXT DEFAULT 'cab',
  ADD COLUMN IF NOT EXISTS customer_name        TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone       TEXT,
  ADD COLUMN IF NOT EXISTS pickup_latitude      NUMERIC,
  ADD COLUMN IF NOT EXISTS pickup_longitude     NUMERIC,
  ADD COLUMN IF NOT EXISTS pickup_place_id      TEXT,
  ADD COLUMN IF NOT EXISTS drop_latitude        NUMERIC,
  ADD COLUMN IF NOT EXISTS drop_longitude       NUMERIC,
  ADD COLUMN IF NOT EXISTS drop_place_id        TEXT,
  ADD COLUMN IF NOT EXISTS failure_reason       TEXT,
  ADD COLUMN IF NOT EXISTS payment_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source               TEXT DEFAULT 'Online';

-- ── 2. Index for fast filtering ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cab_bookings_booking_source ON public.cab_bookings(booking_source);
CREATE INDEX IF NOT EXISTS idx_cab_bookings_hub_partner_id ON public.cab_bookings(hub_partner_id);

-- ── 3. Backfill booking_source for existing rows ─────────────────
UPDATE public.cab_bookings
SET booking_source = CASE
  WHEN pickup_location ILIKE '%airport%' OR drop_location ILIKE '%airport%' THEN 'airport_transfer'
  WHEN booking_type ILIKE '%4 hour%' OR booking_type ILIKE '%4hrs%'         THEN 'local_4hrs'
  WHEN booking_type ILIKE '%8 hour%' OR booking_type ILIKE '%8hrs%'         THEN 'local_8hrs'
  WHEN booking_type ILIKE '%outstation%'                                      THEN 'outstation_cab'
  ELSE 'outstation_cab'
END
WHERE booking_source IS NULL;

-- ── 4. UPDATE RLS: travellers & hub partners ─────────────────────
DROP POLICY IF EXISTS "Travellers can update own cab bookings" ON public.cab_bookings;
CREATE POLICY "Travellers can update own cab bookings" ON public.cab_bookings
  FOR UPDATE TO authenticated
  USING (traveller_id = auth.uid())
  WITH CHECK (traveller_id = auth.uid());

DROP POLICY IF EXISTS "Hub partners can update assigned cab bookings" ON public.cab_bookings;
CREATE POLICY "Hub partners can update assigned cab bookings" ON public.cab_bookings
  FOR UPDATE TO authenticated
  USING (hub_partner_id = auth.uid())
  WITH CHECK (hub_partner_id = auth.uid());

-- ── 5. Fix sync trigger to also cover listing_type = 'cab' ───────
CREATE OR REPLACE FUNCTION public.sync_cab_booking_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.listing_type IN ('car', 'bike', 'vehicle', 'cab') THEN
    UPDATE public.cab_bookings
    SET payment_status = NEW.payment_status,
        booking_status = NEW.booking_status,
        payment_id     = NEW.transaction_id
    WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
