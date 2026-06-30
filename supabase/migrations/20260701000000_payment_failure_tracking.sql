-- Payment Failure Tracking
-- Adds 'failed' booking_status, failure columns to all booking tables, and payment_attempts history table

COMMIT;

-- 1. Add 'failed' to booking_status enum (must run outside transaction)
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'failed';

BEGIN;

-- 2. Failure tracking columns on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_gateway_response JSONB,
  ADD COLUMN IF NOT EXISTS payment_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_failure_count INT NOT NULL DEFAULT 0;

-- 3. Failure tracking columns on cab_bookings
ALTER TABLE public.cab_bookings
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_gateway_response JSONB,
  ADD COLUMN IF NOT EXISTS payment_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_failure_count INT NOT NULL DEFAULT 0;

-- 4. Failure tracking columns on package_bookings
ALTER TABLE public.package_bookings
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_gateway_response JSONB,
  ADD COLUMN IF NOT EXISTS payment_attempted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_failure_count INT NOT NULL DEFAULT 0;

-- 5. Payment attempts history table
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  booking_table TEXT NOT NULL DEFAULT 'bookings',
  attempt_number INT NOT NULL DEFAULT 1,
  payment_gateway TEXT NOT NULL DEFAULT 'razorpay',
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  amount NUMERIC(12,2),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'cancelled')),
  failure_reason TEXT,
  gateway_response JSONB,
  attempted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_booking_id ON public.payment_attempts(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON public.payment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_attempted_by ON public.payment_attempts(attempted_by);

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

-- Edge Functions (service role) have full access
CREATE POLICY "service_role_all_payment_attempts"
  ON public.payment_attempts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admins can read all attempts
CREATE POLICY "admin_read_payment_attempts"
  ON public.payment_attempts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Users can insert attempts for their own bookings (frontend-triggered failures)
CREATE POLICY "users_insert_own_payment_attempts"
  ON public.payment_attempts FOR INSERT TO authenticated
  WITH CHECK (
    attempted_by = auth.uid() AND (
      (booking_table = 'bookings' AND EXISTS (
        SELECT 1 FROM public.bookings WHERE id = booking_id AND user_id = auth.uid()
      ))
      OR
      (booking_table = 'package_bookings' AND EXISTS (
        SELECT 1 FROM public.package_bookings WHERE id = booking_id AND user_id = auth.uid()
      ))
    )
  );

-- Users can read their own attempts
CREATE POLICY "users_read_own_payment_attempts"
  ON public.payment_attempts FOR SELECT TO authenticated
  USING (attempted_by = auth.uid());

-- 6. Update cab_bookings sync trigger to also sync failure columns
CREATE OR REPLACE FUNCTION public.sync_cab_booking_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.listing_type = 'car' OR NEW.listing_type = 'bike' OR NEW.listing_type = 'vehicle' THEN
    UPDATE public.cab_bookings
    SET payment_status       = NEW.payment_status,
        booking_status       = NEW.booking_status,
        payment_id           = NEW.transaction_id,
        failure_reason       = NEW.failure_reason,
        payment_attempted_at = NEW.payment_attempted_at
    WHERE booking_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
