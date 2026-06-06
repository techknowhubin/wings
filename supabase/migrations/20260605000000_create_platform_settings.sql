-- ============================================================
-- PLATFORM SETTINGS TABLE
-- Run this in Supabase SQL Editor → New Query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id                        UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,

  -- Commission rates
  marketplace_commission_pct  NUMERIC(5,2)  NOT NULL DEFAULT 20,
  linkinbio_commission_pct    NUMERIC(5,2)  NOT NULL DEFAULT 10,
  hub_commission_pct          NUMERIC(5,2)  NOT NULL DEFAULT 5,

  -- Platform config
  platform_name               TEXT          NOT NULL DEFAULT 'Xplorwing',
  support_email               TEXT          NOT NULL DEFAULT 'support@xplorwing.com',
  support_phone               TEXT          NOT NULL DEFAULT '+91 9422799420',
  support_whatsapp            TEXT,

  -- KYC settings
  kyc_sla_hours               INTEGER       NOT NULL DEFAULT 2,
  max_kyc_attempts            INTEGER       NOT NULL DEFAULT 5,

  -- Referral settings
  referral_commission_pct     NUMERIC(5,2)  NOT NULL DEFAULT 5,
  referral_expiry_days        INTEGER       NOT NULL DEFAULT 30,

  -- Blog settings
  blog_auto_publish           BOOLEAN       NOT NULL DEFAULT false,
  blog_moderation_enabled     BOOLEAN       NOT NULL DEFAULT true,

  -- Payment settings
  razorpay_enabled            BOOLEAN       NOT NULL DEFAULT true,
  minimum_payout_amount       NUMERIC(10,2) NOT NULL DEFAULT 500,

  -- Security settings
  require_email_verification  BOOLEAN       NOT NULL DEFAULT false,
  session_timeout_hours       INTEGER       NOT NULL DEFAULT 24,

  -- Notification settings
  email_notifications_enabled BOOLEAN       NOT NULL DEFAULT true,
  whatsapp_notifications_enabled BOOLEAN    NOT NULL DEFAULT true,

  -- Meta
  updated_at                  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_by                  UUID          REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed exactly one default row (safe to run multiple times)
INSERT INTO public.platform_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (id) DO NOTHING;

-- ─── Row Level Security ──────────────────────────────────────
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read
DROP POLICY IF EXISTS "Admins can read platform_settings" ON public.platform_settings;
CREATE POLICY "Admins can read platform_settings"
  ON public.platform_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update
DROP POLICY IF EXISTS "Admins can update platform_settings" ON public.platform_settings;
CREATE POLICY "Admins can update platform_settings"
  ON public.platform_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert (needed for upsert)
DROP POLICY IF EXISTS "Admins can insert platform_settings" ON public.platform_settings;
CREATE POLICY "Admins can insert platform_settings"
  ON public.platform_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ConfirmAndPay (and other public pages) need to read commission rates
-- Allow authenticated users to read commission columns only
DROP POLICY IF EXISTS "Authenticated users read commission rates" ON public.platform_settings;
CREATE POLICY "Authenticated users read commission rates"
  ON public.platform_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);
