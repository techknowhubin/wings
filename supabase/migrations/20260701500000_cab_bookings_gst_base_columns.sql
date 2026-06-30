-- Add GST and base amount columns to cab_bookings
-- These are missing from cab_bookings despite being in the bookings table (added 20260622000000_gst_management.sql)
-- Without these, ConfirmAndPay's cab_bookings INSERT fails with "column does not exist"

ALTER TABLE public.cab_bookings
  ADD COLUMN IF NOT EXISTS base_amount    NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_amount     NUMERIC(10,2) DEFAULT 0;
