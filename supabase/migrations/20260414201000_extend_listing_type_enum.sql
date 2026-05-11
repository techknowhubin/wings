COMMIT;

ALTER TYPE public.listing_type ADD VALUE IF NOT EXISTS 'hotel';
ALTER TYPE public.listing_type ADD VALUE IF NOT EXISTS 'resort';
