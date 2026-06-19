-- Add RLS policy to allow Hub Partners to view tour packages that have been assigned to them
-- regardless of the global package status (e.g., if it's still 'draft')

DROP POLICY IF EXISTS "Hubs can view their assigned packages" ON public.tour_packages;
CREATE POLICY "Hubs can view their assigned packages" ON public.tour_packages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.package_assignments
        WHERE package_assignments.package_id = tour_packages.id
        AND package_assignments.hub_id = auth.uid()
    )
);

-- Additionally, ensure we can assign a 'revoked' status in package_assignments
-- The status column is TEXT, so we just add a comment indicating 'revoked' is valid
COMMENT ON COLUMN public.package_assignments.status IS 'assigned, published, unpublished, revoked';
