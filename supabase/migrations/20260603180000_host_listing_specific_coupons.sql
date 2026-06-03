-- Alter table host_coupons to support listing-specific coupons, flat discounts, and expiration
ALTER TABLE public.host_coupons
  ADD COLUMN IF NOT EXISTS listing_id uuid NULL,
  ADD COLUMN IF NOT EXISTS listing_type text NULL,
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'flat')),
  ADD COLUMN IF NOT EXISTS discount_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL;

-- Drop check constraint on discount_percent to allow nullable
ALTER TABLE public.host_coupons DROP CONSTRAINT IF EXISTS host_coupons_discount_percent_check;
ALTER TABLE public.host_coupons ALTER COLUMN discount_percent DROP NOT NULL;

-- Backfill existing data
UPDATE public.host_coupons
SET
  discount_value = COALESCE(discount_percent, 0),
  is_enabled = is_active,
  expires_at = ends_at;
