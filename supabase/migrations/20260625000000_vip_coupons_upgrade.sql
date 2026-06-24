-- 1. Add new columns to host_coupons
ALTER TABLE public.host_coupons
ADD COLUMN IF NOT EXISTS max_discount numeric,
ADD COLUMN IF NOT EXISTS min_booking_amount numeric DEFAULT 0;

COMMENT ON COLUMN public.host_coupons.max_discount IS 'Maximum discount amount for percentage coupons.';
COMMENT ON COLUMN public.host_coupons.min_booking_amount IS 'Minimum booking amount required to apply this coupon.';

-- 2. Create coupon assignments table for multi-user assignment
CREATE TABLE IF NOT EXISTS public.host_coupon_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id uuid REFERENCES public.host_coupons(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coupon_id, user_id)
);

-- Enable RLS on the new table
ALTER TABLE public.host_coupon_assignments ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for host_coupon_assignments

-- Hub Partners can see and manage assignments for their own coupons
CREATE POLICY "Hub Partners can manage assignments for their coupons"
  ON public.host_coupon_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.host_coupons c
      JOIN public.hubs h ON c.host_id = h.id
      WHERE c.id = host_coupon_assignments.coupon_id
      AND h.uuid = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.host_coupons c
      JOIN public.hubs h ON c.host_id = h.id
      WHERE c.id = host_coupon_assignments.coupon_id
      AND h.uuid = auth.uid()
    )
  );

-- Travellers can view their own assignments
CREATE POLICY "Travellers can view their assignments"
  ON public.host_coupon_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Migrate existing data (if target_user_id was previously used)
INSERT INTO public.host_coupon_assignments (coupon_id, user_id)
SELECT id, target_user_id
FROM public.host_coupons
WHERE target_user_id IS NOT NULL
ON CONFLICT (coupon_id, user_id) DO NOTHING;

-- Note: We are keeping the legacy `target_user_id` column for backward compatibility,
-- but the new VIP Coupons module will read and write to `host_coupon_assignments`.
