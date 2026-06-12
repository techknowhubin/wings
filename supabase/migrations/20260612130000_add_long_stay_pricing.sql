-- ============================================================
-- Add Long Stay Pricing Engine Fields
-- ============================================================

DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY['stays', 'hotels', 'resorts', 'cars', 'bikes', 'experiences'])
    LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS long_stay_discount_7 integer DEFAULT 0 CHECK (long_stay_discount_7 >= 0 AND long_stay_discount_7 <= 90)', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS long_stay_discount_14 integer DEFAULT 0 CHECK (long_stay_discount_14 >= 0 AND long_stay_discount_14 <= 90)', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS long_stay_discount_30 integer DEFAULT 0 CHECK (long_stay_discount_30 >= 0 AND long_stay_discount_30 <= 90)', t);
        
        -- Add constraint: 30 >= 14 >= 7
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS check_long_stay_progression', t);
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT check_long_stay_progression CHECK (long_stay_discount_14 >= long_stay_discount_7 AND long_stay_discount_30 >= long_stay_discount_14)', t);
    END LOOP;
END $$;
