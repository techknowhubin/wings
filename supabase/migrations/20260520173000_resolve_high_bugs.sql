-- 1. Host Profiles Alterations
ALTER TABLE public.host_profiles
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS msme_number text,
  ADD COLUMN IF NOT EXISTS host_type text DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'pending';

-- 2. Create public 'listings' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for listings bucket
CREATE POLICY "Any user can view listings images" ON storage.objects FOR SELECT USING (bucket_id = 'listings');
CREATE POLICY "Users can upload listings images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update listings images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete listings images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. platform_settings select policy update & seed update
DROP POLICY IF EXISTS "Admins can read platform settings" ON public.platform_settings;
CREATE POLICY "Allow public select on platform settings" ON public.platform_settings FOR SELECT USING (true);
UPDATE public.platform_settings
SET support_phone = '+91 9492986412', support_email = 'hello@xplorwing.com'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 4. host_coupons alterations & platform offers seed
ALTER TABLE public.host_coupons ALTER COLUMN host_id DROP NOT NULL;
ALTER TABLE public.host_coupons
  ADD COLUMN IF NOT EXISTS is_platform_offer boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS emoji text,
  ADD COLUMN IF NOT EXISTS terms text[];

ALTER TABLE public.host_coupons DROP CONSTRAINT IF EXISTS host_coupons_host_id_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS host_coupons_host_id_code_idx ON public.host_coupons (host_id, code) WHERE host_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS host_coupons_platform_code_idx ON public.host_coupons (code) WHERE is_platform_offer = true;

CREATE POLICY "Anyone can view platform coupons" ON public.host_coupons FOR SELECT USING (is_platform_offer = true);

-- Seed offers
INSERT INTO public.host_coupons (code, discount_percent, listing_types, is_active, is_platform_offer, title, emoji, terms, starts_at, ends_at)
VALUES 
  ('WINGFIRST', 10, ARRAY['stays'], true, true, 'Save up to ₹500 on' || chr(10) || 'your first booking', '🏕️', ARRAY['Applicable only for first-time users on Xplorwing stays.','Minimum booking value of ₹2,500 is required.','Get 10% discount up to a maximum of ₹500.','Cannot be combined with any other promotional offers.','Valid on all homestays listed on the Xplorwing platform.'], now(), '2026-12-31 23:59:59+00'),
  ('CABSAVE200', 15, ARRAY['cars', 'bikes'], true, true, 'Flat ₹200 off on' || chr(10) || 'airport transfers', '🚙', ARRAY['Flat ₹200 discount applicable on airport transfers.','Minimum ride value must be ₹1,500.','Applicable only on outstation cab bookings.','Tolls, parking fees, and state taxes are charged extra.','Cannot be clubbed with other active discount codes.'], now(), '2026-12-31 23:59:59+00'),
  ('TREK15', 15, ARRAY['experiences'], true, true, 'Get 15% off on' || chr(10) || 'curated treks', '🏔️', ARRAY['Get 15% discount on curated trekking experiences.','Maximum discount limit is ₹1,000 per booking.','Valid for booking of minimum 2 travelers.','Must book at least 48 hours prior to the trek start time.','Discount is non-refundable upon booking cancellation.'], now(), '2026-12-31 23:59:59+00'),
  ('GREEN300', 12, ARRAY['stays'], true, true, '₹300 off on plantation' || chr(10) || 'stay packages', '🍃', ARRAY['Flat ₹300 discount on selected plantation stay bookings.','Minimum stay duration of 2 nights is required.','Only valid on stays categorized under ''Plantation Stays''.','Subject to room availability and host confirmation.','Standard cancellation policies apply.'], now(), '2026-12-31 23:59:59+00')
ON CONFLICT (code) WHERE is_platform_offer = true DO NOTHING;

-- 5. bookings table alterations
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_channel text DEFAULT 'marketplace',
  ADD COLUMN IF NOT EXISTS commission_amount numeric(10,2);
