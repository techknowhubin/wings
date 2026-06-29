-- Add airport_parking_charge to platform_settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS airport_parking_charge NUMERIC DEFAULT 350;

-- Add airport_parking_charge to cab_bookings
ALTER TABLE public.cab_bookings 
ADD COLUMN IF NOT EXISTS airport_parking_charge NUMERIC DEFAULT 0;
