-- Drop policy if it already exists
DROP POLICY IF EXISTS "travellers_can_view_assigned_coupons" ON public.host_coupons;

-- Create a helper function with SECURITY DEFINER to break the RLS recursion
CREATE OR REPLACE FUNCTION public.check_coupon_assignment(coupon_id uuid, user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.host_coupon_assignments
    WHERE coupon_id = $1 AND user_id = $2
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Create SELECT policy to allow travellers to see coupons that are explicitly assigned to them
CREATE POLICY "travellers_can_view_assigned_coupons"
  ON public.host_coupons FOR SELECT TO authenticated
  USING (
    public.check_coupon_assignment(id, auth.uid())
    OR target_user_id = auth.uid()
    OR target_email = (auth.jwt() ->> 'email')
    OR target_phone = (auth.jwt() ->> 'phone')
  );
