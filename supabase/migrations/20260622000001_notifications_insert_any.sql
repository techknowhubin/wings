-- Allow authenticated users to insert notifications for other users
-- This is required for bookings, where the traveller creates a notification for the host
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;

CREATE POLICY "notifications_insert_any"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);
