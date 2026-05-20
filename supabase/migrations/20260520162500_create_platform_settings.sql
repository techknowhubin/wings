CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_commission_pct numeric(5,2) NOT NULL DEFAULT 20.00,
  linkinbio_commission_pct numeric(5,2) NOT NULL DEFAULT 10.00,
  hub_commission_pct numeric(5,2) NOT NULL DEFAULT 5.00,
  kyc_sla_hours integer NOT NULL DEFAULT 2,
  max_kyc_attempts integer NOT NULL DEFAULT 5,
  platform_name text NOT NULL DEFAULT 'Xplorwing',
  support_email text NOT NULL DEFAULT 'support@xplorwing.com',
  support_phone text NOT NULL DEFAULT '+91 1800-123-4567',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins can write platform settings" ON public.platform_settings;

CREATE POLICY "Admins can read platform settings"
  ON public.platform_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can write platform settings"
  ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed one canonical row for singleton usage in admin UI
INSERT INTO public.platform_settings (
  id,
  marketplace_commission_pct,
  linkinbio_commission_pct,
  hub_commission_pct,
  kyc_sla_hours,
  max_kyc_attempts,
  platform_name,
  support_email,
  support_phone
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  20.00,
  10.00,
  5.00,
  2,
  5,
  'Xplorwing',
  'support@xplorwing.com',
  '+91 1800-123-4567'
)
ON CONFLICT (id) DO NOTHING;

