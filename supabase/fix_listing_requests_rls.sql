-- ============================================================
-- FIX: Admin Revenue Analytics - Allow reading booking stats without strict auth
-- Also fixes notifications INSERT and listing_type_requests admin visibility
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── notifications table ───────────────────────────────────────
DROP POLICY IF EXISTS "admin_insert_notifications"  ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "users_view_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "anon_read_all_notifications" ON public.notifications;
DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "users_delete_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "authenticated_insert_notifications" ON public.notifications;

-- Authenticated users can view their own notifications
CREATE POLICY "users_view_own_notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow anon to read all notifications (for "no-login" host dashboard)
CREATE POLICY "anon_read_all_notifications" ON public.notifications
  FOR SELECT TO anon
  USING (true);

-- Users can update their own notifications
CREATE POLICY "users_update_own_notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "users_delete_own_notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users (admin) can INSERT notifications for any user
CREATE POLICY "authenticated_insert_notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── listing_type_requests table ───────────────────────────────
DROP POLICY IF EXISTS "host_view_own_requests"   ON public.listing_type_requests;
DROP POLICY IF EXISTS "host_insert_own_requests" ON public.listing_type_requests;
DROP POLICY IF EXISTS "admin_manage_requests"    ON public.listing_type_requests;
DROP POLICY IF EXISTS "admin_read_all_requests"  ON public.listing_type_requests;

CREATE POLICY "host_view_own_requests" ON public.listing_type_requests
  FOR SELECT TO authenticated
  USING (host_id = auth.uid());

CREATE POLICY "host_insert_own_requests" ON public.listing_type_requests
  FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "admin_read_all_requests" ON public.listing_type_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_manage_requests" ON public.listing_type_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── bookings table: allow admins to read ALL bookings ─────────
-- Drop any existing admin-read policy on bookings
DROP POLICY IF EXISTS "admin_read_all_bookings" ON public.bookings;

-- Allow admin (user with admin role) to read all bookings
CREATE POLICY "admin_read_all_bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── RPC: Get booking analytics summary (no auth needed) ───────
-- This allows the admin analytics page to show data without login
CREATE OR REPLACE FUNCTION public.get_booking_analytics_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  total_gmv NUMERIC := 0;
  total_commission NUMERIC := 0;
  total_bookings INTEGER := 0;
  completed_bookings INTEGER := 0;
  pending_bookings INTEGER := 0;
  today_revenue NUMERIC := 0;
  month_revenue NUMERIC := 0;
  today_str TEXT := to_char(now(), 'YYYY-MM-DD');
  month_str TEXT := to_char(now(), 'YYYY-MM');
BEGIN
  SELECT
    COUNT(*),
    COALESCE(SUM(total_price), 0),
    COALESCE(SUM(commission_amount), 0),
    COUNT(*) FILTER (WHERE booking_status IN ('confirmed', 'completed') AND payment_status = 'completed'),
    COUNT(*) FILTER (WHERE payment_status = 'pending'),
    COALESCE(SUM(commission_amount) FILTER (WHERE DATE(created_at) = today_str::date AND payment_status = 'completed'), 0),
    COALESCE(SUM(commission_amount) FILTER (WHERE to_char(created_at, 'YYYY-MM') = month_str AND payment_status = 'completed'), 0)
  INTO total_bookings, total_gmv, total_commission, completed_bookings, pending_bookings, today_revenue, month_revenue
  FROM public.bookings;

  result := json_build_object(
    'total_bookings', total_bookings,
    'total_gmv', total_gmv,
    'total_commission', total_commission,
    'completed_bookings', completed_bookings,
    'pending_bookings', pending_bookings,
    'today_revenue', today_revenue,
    'month_revenue', month_revenue
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_analytics_summary() TO anon, authenticated;

-- RPC: Get all bookings for analytics (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_all_bookings_for_analytics()
RETURNS TABLE (
  id UUID,
  listing_type TEXT,
  host_id UUID,
  total_price NUMERIC,
  commission_amount NUMERIC,
  booking_channel TEXT,
  booking_status TEXT,
  payment_status TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  guests_count INTEGER,
  start_date DATE,
  end_date DATE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id, listing_type, host_id, total_price, commission_amount,
    booking_channel, booking_status, payment_status, created_at,
    user_id, guests_count, start_date, end_date
  FROM public.bookings
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_bookings_for_analytics() TO anon, authenticated;
