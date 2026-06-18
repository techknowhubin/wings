-- ============================================================
-- Hub Partner Operations System — Extended Schema
-- ============================================================

-- 1. Walk-In Enquiries Table
CREATE TABLE IF NOT EXISTS public.walkin_enquiries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_uuid    uuid REFERENCES public.hubs(uuid) ON DELETE CASCADE,
  name        text NOT NULL,
  mobile      text NOT NULL,
  email       text,
  destination text,
  travel_date date,
  budget      numeric(12,2),
  service_type text,
  notes       text,
  lead_source text DEFAULT 'Walk-In',   -- Walk-In | Phone Call | WhatsApp | Referral | Social Media
  lead_status text DEFAULT 'New',       -- New | Interested | Quotation Sent | Follow-Up | Converted | Lost
  follow_up_date date,
  converted_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.walkin_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all walkin_enquiries" ON public.walkin_enquiries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Hub partners manage their hub walkin_enquiries" ON public.walkin_enquiries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hubs WHERE uuid = hub_uuid AND id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.hubs WHERE uuid = hub_uuid AND id = auth.uid()));

-- 2. Hub Support Tickets Table
CREATE TABLE IF NOT EXISTS public.hub_support_tickets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_uuid      uuid REFERENCES public.hubs(uuid) ON DELETE CASCADE,
  traveller_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  booking_id    uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  issue_type    text,     -- Booking Issue | Refund | Driver Complaint | Host Complaint | Other
  description   text NOT NULL,
  status        text DEFAULT 'Open',   -- Open | In Progress | Escalated | Resolved | Closed
  priority      text DEFAULT 'Medium', -- Low | Medium | High | Critical
  resolved_at   timestamptz,
  resolution_notes text,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.hub_support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all hub_support_tickets" ON public.hub_support_tickets
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Hub partners manage their hub tickets" ON public.hub_support_tickets
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hubs WHERE uuid = hub_uuid AND id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.hubs WHERE uuid = hub_uuid AND id = auth.uid()));

-- 3. Hub Earnings Table
CREATE TABLE IF NOT EXISTS public.hub_earnings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_uuid        uuid REFERENCES public.hubs(uuid) ON DELETE CASCADE,
  booking_id      uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  booking_type    text,                 -- cab | marketplace
  gross_amount    numeric(12,2) DEFAULT 0,
  hub_commission  numeric(12,2) DEFAULT 0,  -- hub's cut
  platform_fee    numeric(12,2) DEFAULT 0,  -- platform's cut
  net_amount      numeric(12,2) DEFAULT 0,  -- hub receives
  status          text DEFAULT 'Pending',   -- Pending | Cleared | On Hold
  settlement_date date,
  period          text,                     -- YYYY-MM for grouping
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.hub_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all hub_earnings" ON public.hub_earnings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Hub partners view their earnings" ON public.hub_earnings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hubs WHERE uuid = hub_uuid AND id = auth.uid()));

-- 4. Add rating/performance columns to hub_drivers if not present
ALTER TABLE public.hub_drivers
  ADD COLUMN IF NOT EXISTS rating       numeric(3,2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS total_trips  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS notes        text;

-- 5. Add columns to hub_vehicles if not present
ALTER TABLE public.hub_vehicles
  ADD COLUMN IF NOT EXISTS insurance_expiry  date,
  ADD COLUMN IF NOT EXISTS permit_expiry     date,
  ADD COLUMN IF NOT EXISTS fitness_expiry    date,
  ADD COLUMN IF NOT EXISTS insurance_number  text,
  ADD COLUMN IF NOT EXISTS permit_number     text,
  ADD COLUMN IF NOT EXISTS notes             text;

-- 6. Add columns to cab_bookings only if the table exists
--    (cab_bookings is created by an earlier migration; this guard prevents
--     failure when migrations are applied out of order or from scratch)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cab_bookings'
  ) THEN
    -- return_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cab_bookings' AND column_name='return_date') THEN
      ALTER TABLE public.cab_bookings ADD COLUMN return_date timestamptz;
    END IF;

    -- assigned_hub_uuid
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cab_bookings' AND column_name='assigned_hub_uuid') THEN
      ALTER TABLE public.cab_bookings ADD COLUMN assigned_hub_uuid uuid REFERENCES public.hubs(uuid) ON DELETE SET NULL;
    END IF;

    -- driver_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cab_bookings' AND column_name='driver_id') THEN
      ALTER TABLE public.cab_bookings ADD COLUMN driver_id uuid REFERENCES public.hub_drivers(id) ON DELETE SET NULL;
    END IF;

    -- trip_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cab_bookings' AND column_name='trip_status') THEN
      ALTER TABLE public.cab_bookings ADD COLUMN trip_status text DEFAULT 'Awaiting Assignment';
    END IF;

    -- service_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cab_bookings' AND column_name='service_type') THEN
      ALTER TABLE public.cab_bookings ADD COLUMN service_type text DEFAULT 'Outstation Cab';
    END IF;

    -- source
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cab_bookings' AND column_name='source') THEN
      ALTER TABLE public.cab_bookings ADD COLUMN source text DEFAULT 'Online';
    END IF;

    -- 7. Backfill trip_status from assignment_status where null
    UPDATE public.cab_bookings
    SET trip_status = COALESCE(assignment_status, 'Awaiting Assignment')
    WHERE trip_status IS NULL;

  END IF;
END $$;
