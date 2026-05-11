-- ============================================================
-- Admin Dashboard Migration
-- Created: 2026-04-21
-- Description: Approval workflows, KYC submissions, Hub 
--   Partners, Payouts, and Admin RLS policies.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add approval_status, rejection_reason, submitted_for_review_at
--    to all listing tables
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.stays
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected','needs_revision')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz;

ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected','needs_revision')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz;

ALTER TABLE public.resorts
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected','needs_revision')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz;

ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected','needs_revision')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz;

ALTER TABLE public.bikes
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected','needs_revision')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz;

ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected','needs_revision')),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz;

-- Mark all existing active listings as approved
-- All listing tables use availability_status
UPDATE public.stays SET approval_status = 'approved' WHERE availability_status = true;
UPDATE public.hotels SET approval_status = 'approved' WHERE availability_status = true;
UPDATE public.resorts SET approval_status = 'approved' WHERE availability_status = true;
UPDATE public.cars SET approval_status = 'approved' WHERE availability_status = true;
UPDATE public.bikes SET approval_status = 'approved' WHERE availability_status = true;
UPDATE public.experiences SET approval_status = 'approved' WHERE availability_status = true;

-- ────────────────────────────────────────────────────────────
-- 2. Add kyc_status, wing_id, onboarding_completed to profiles
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'not_started'
    CHECK (kyc_status IN ('not_started','pending','under_review','approved','rejected','re_upload_requested')),
  ADD COLUMN IF NOT EXISTS wing_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- ────────────────────────────────────────────────────────────
-- 3. Create kyc_submissions table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type     text        NOT NULL CHECK (document_type IN ('aadhaar','driving_licence','passport')),
  document_front_url text       NOT NULL,
  document_back_url  text,
  document_hash      text,
  status             text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','under_review','approved','rejected','re_upload_requested')),
  submitted_at       timestamptz NOT NULL DEFAULT now(),
  reviewed_at        timestamptz,
  reviewed_by        uuid        REFERENCES auth.users(id),
  rejection_reason   text,
  review_notes       text,
  attempt_number     integer     NOT NULL DEFAULT 1,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own KYC submissions" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Users insert own KYC submissions" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Admins full access to KYC submissions" ON public.kyc_submissions;

CREATE POLICY "Users view own KYC submissions"
  ON public.kyc_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own KYC submissions"
  ON public.kyc_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins full access to KYC submissions"
  ON public.kyc_submissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ────────────────────────────────────────────────────────────
-- 4. Create hub_partners table
--    Hub Partners are physical locations (restaurants, franchise
--    outlets) that promote Xplorwing tourism via referral QR codes.
--    They earn commission on bookings & KYC generated from their
--    physical presence.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hub_partners (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name       text        NOT NULL,
  partner_name        text        NOT NULL,
  partner_phone       text        NOT NULL,
  partner_email       text,
  address             text        NOT NULL,
  city                text        NOT NULL,
  state               text        NOT NULL,
  pincode             text,
  hub_type            text        NOT NULL DEFAULT 'collaborator'
    CHECK (hub_type IN ('franchise','collaborator','restaurant')),
  qr_tracking_id      text        UNIQUE NOT NULL DEFAULT ('HUB-' || upper(substring(gen_random_uuid()::text, 1, 8))),
  commission_rate     numeric(5,2) NOT NULL DEFAULT 5.00,
  is_active           boolean     NOT NULL DEFAULT true,
  -- Aggregated counters (updated via triggers or edge functions)
  total_referrals     integer     NOT NULL DEFAULT 0,
  total_bookings      integer     NOT NULL DEFAULT 0,
  total_kyc_done      integer     NOT NULL DEFAULT 0,
  total_commission    numeric(12,2) NOT NULL DEFAULT 0.00,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid        REFERENCES auth.users(id)
);

ALTER TABLE public.hub_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage hub partners" ON public.hub_partners;
DROP POLICY IF EXISTS "Public can view active hubs" ON public.hub_partners;

CREATE POLICY "Admins manage hub partners"
  ON public.hub_partners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view active hubs"
  ON public.hub_partners FOR SELECT TO authenticated
  USING (is_active = true);

-- Hub referral events (tracks each QR scan / referral action)
CREATE TABLE IF NOT EXISTS public.hub_referral_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id          uuid        NOT NULL REFERENCES public.hub_partners(id) ON DELETE CASCADE,
  event_type      text        NOT NULL CHECK (event_type IN ('qr_scan','booking','kyc_completed')),
  user_id         uuid        REFERENCES auth.users(id),
  booking_id      uuid,
  commission_earned numeric(10,2) DEFAULT 0.00,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hub_referral_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view hub referral events"
  ON public.hub_referral_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ────────────────────────────────────────────────────────────
-- 5. Create payouts table
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payouts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id          uuid,       -- nullable: can be a batch payout
  amount              numeric(12,2) NOT NULL,
  platform_commission numeric(12,2) NOT NULL DEFAULT 0.00,
  net_payout          numeric(12,2) NOT NULL,
  status              text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','paid','failed')),
  payment_reference   text,       -- UTR / transaction ID from payment processor
  payment_method      text        DEFAULT 'bank_transfer',
  notes               text,
  initiated_by        uuid        REFERENCES auth.users(id),
  paid_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers view own payouts" ON public.payouts;
DROP POLICY IF EXISTS "Admins manage all payouts" ON public.payouts;

CREATE POLICY "Providers view own payouts"
  ON public.payouts FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Admins manage all payouts"
  ON public.payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ────────────────────────────────────────────────────────────
-- 6. Admin RLS policies — Listings
-- ────────────────────────────────────────────────────────────

-- stays
DROP POLICY IF EXISTS "Admins can view all stays" ON public.stays;
DROP POLICY IF EXISTS "Admins can update stays approval" ON public.stays;

CREATE POLICY "Admins can view all stays"
  ON public.stays FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update stays approval"
  ON public.stays FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- hotels
DROP POLICY IF EXISTS "Admins can view all hotels" ON public.hotels;
DROP POLICY IF EXISTS "Admins can update hotels approval" ON public.hotels;

CREATE POLICY "Admins can view all hotels"
  ON public.hotels FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update hotels approval"
  ON public.hotels FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- resorts
DROP POLICY IF EXISTS "Admins can view all resorts" ON public.resorts;
DROP POLICY IF EXISTS "Admins can update resorts approval" ON public.resorts;

CREATE POLICY "Admins can view all resorts"
  ON public.resorts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update resorts approval"
  ON public.resorts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- cars
DROP POLICY IF EXISTS "Admins can view all cars" ON public.cars;
DROP POLICY IF EXISTS "Admins can update cars approval" ON public.cars;

CREATE POLICY "Admins can view all cars"
  ON public.cars FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cars approval"
  ON public.cars FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- bikes
DROP POLICY IF EXISTS "Admins can view all bikes" ON public.bikes;
DROP POLICY IF EXISTS "Admins can update bikes approval" ON public.bikes;

CREATE POLICY "Admins can view all bikes"
  ON public.bikes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bikes approval"
  ON public.bikes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- experiences
DROP POLICY IF EXISTS "Admins can view all experiences" ON public.experiences;
DROP POLICY IF EXISTS "Admins can update experiences approval" ON public.experiences;

CREATE POLICY "Admins can view all experiences"
  ON public.experiences FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update experiences approval"
  ON public.experiences FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ────────────────────────────────────────────────────────────
-- 7. Admin RLS — profiles and bookings
-- ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update booking status" ON public.bookings;

CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update booking status"
  ON public.bookings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
