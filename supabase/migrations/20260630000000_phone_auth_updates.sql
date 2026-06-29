-- Add WhatsApp-specific columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '+91';

-- Create an RPC to check if a phone number is registered
CREATE OR REPLACE FUNCTION public.check_phone_registered(check_phone text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_registered boolean;
BEGIN
    -- Check against the raw phone number (Supabase Auth usually normalizes it with +91)
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE phone = check_phone
    ) INTO is_registered;
    
    RETURN is_registered;
END;
$$;
