-- Alter table host_coupons to support user-specific platform offers
ALTER TABLE public.host_coupons
  ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_email text,
  ADD COLUMN IF NOT EXISTS target_phone text;

COMMENT ON COLUMN public.host_coupons.target_user_id IS 'If set, only this user can redeem the coupon.';
COMMENT ON COLUMN public.host_coupons.target_email IS 'If set, only users with this email can redeem the coupon.';
COMMENT ON COLUMN public.host_coupons.target_phone IS 'If set, only users with this phone number can redeem the coupon.';
