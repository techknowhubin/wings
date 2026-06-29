-- Add weekly and monthly pricing to cars and bikes
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS weekly_price DECIMAL(10, 2);
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10, 2);

ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS weekly_price DECIMAL(10, 2);
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10, 2);

-- Add duration and pricing split to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'daily';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS duration_value INTEGER;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(10, 2);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS balance_amount DECIMAL(10, 2);

-- Add 'partial_paid' to payment_status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
    END IF;
END$$;

ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'partial_paid';
