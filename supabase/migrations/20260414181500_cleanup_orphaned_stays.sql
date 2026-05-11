-- 1. Delete all orphaned stays (including the 6 demo stays from 20251029) that lack a host_id
DELETE FROM public.stays WHERE host_id IS NULL;

-- 2. Restore the NOT NULL constraint on stays.host_id
ALTER TABLE public.stays ALTER COLUMN host_id SET NOT NULL;

-- 3. Just to be safe and enforce database integrity, we clean up orphans for other listings
DELETE FROM public.cars WHERE host_id IS NULL;
ALTER TABLE public.cars ALTER COLUMN host_id SET NOT NULL;

DELETE FROM public.bikes WHERE host_id IS NULL;
ALTER TABLE public.bikes ALTER COLUMN host_id SET NOT NULL;

DELETE FROM public.experiences WHERE host_id IS NULL;
ALTER TABLE public.experiences ALTER COLUMN host_id SET NOT NULL;

DELETE FROM public.hotels WHERE host_id IS NULL;
ALTER TABLE public.hotels ALTER COLUMN host_id SET NOT NULL;

DELETE FROM public.resorts WHERE host_id IS NULL;
ALTER TABLE public.resorts ALTER COLUMN host_id SET NOT NULL;
