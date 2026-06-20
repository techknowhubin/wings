-- Fix: authenticated users could not insert their own notifications.
-- The RLS hardening migration (20260608012000) created SELECT / UPDATE / DELETE
-- policies but omitted INSERT, causing the "new row violates row-level security
-- policy for table 'notifications'" error when a password change notification
-- was written after a successful supabase.auth.updateUser() call.

DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
CREATE POLICY "notifications_insert_own"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
