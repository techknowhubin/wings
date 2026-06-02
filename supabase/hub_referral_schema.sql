-- =============================================
-- HUB PARTNER REFERRAL SYSTEM - SCHEMA SETUP
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Add referral columns to existing hub_partners table
ALTER TABLE public.hub_partners
  ADD COLUMN IF NOT EXISTS referral_id       TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_link     TEXT,
  ADD COLUMN IF NOT EXISTS total_revenue     NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_commission  NUMERIC(12,2) DEFAULT 0;

-- Back-fill referral_id for any existing rows that don't have one
UPDATE public.hub_partners
SET
  referral_id   = 'HUB-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  referral_link = 'https://xplorwing.com?ref=HUB-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_id IS NULL;

-- 2. Create referral_transactions table
CREATE TABLE IF NOT EXISTS public.referral_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id            UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_id            UUID REFERENCES public.hub_partners(id) ON DELETE SET NULL,
  referral_code         TEXT NOT NULL,
  booking_amount        NUMERIC(12,2) NOT NULL,
  commission_percentage NUMERIC(5,2)  NOT NULL DEFAULT 5,
  commission_amount     NUMERIC(12,2) GENERATED ALWAYS AS
                          (ROUND((booking_amount * commission_percentage / 100), 2)) STORED,
  payment_status        TEXT NOT NULL DEFAULT 'pending'
                          CHECK (payment_status IN ('pending','completed','refunded')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Index for fast partner lookups
CREATE INDEX IF NOT EXISTS idx_referral_tx_partner  ON public.referral_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_referral_tx_booking  ON public.referral_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_referral_tx_code     ON public.referral_transactions(referral_code);
CREATE INDEX IF NOT EXISTS idx_hub_partners_ref_id  ON public.hub_partners(referral_id);

-- 4. RLS on referral_transactions
ALTER TABLE public.referral_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_referral_tx"              ON public.referral_transactions;
DROP POLICY IF EXISTS "user_read_own_referral_tx"          ON public.referral_transactions;
DROP POLICY IF EXISTS "public_read_referral_tx_by_partner" ON public.referral_transactions;

CREATE POLICY "admin_all_referral_tx" ON public.referral_transactions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "user_read_own_referral_tx" ON public.referral_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "public_read_referral_tx_by_partner" ON public.referral_transactions
  FOR SELECT USING (
    partner_id IN (
      SELECT id FROM public.hub_partners WHERE is_active = true
    )
  );

-- 5. RLS on hub_partners
ALTER TABLE public.hub_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access_hub_partners"  ON public.hub_partners;
DROP POLICY IF EXISTS "public_read_active_hub_partners" ON public.hub_partners;

CREATE POLICY "admin_full_access_hub_partners" ON public.hub_partners
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "public_read_active_hub_partners" ON public.hub_partners
  FOR SELECT USING (is_active = true);
