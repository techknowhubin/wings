-- Fix: Allow public/anonymous users to read tour_packages that have at least one published assignment.
--
-- Root cause: CreatePackage always creates packages with status='draft'. The existing
-- "Anyone can view published tour packages" policy filters by tour_packages.status='published',
-- which is never set. Hub partners publish via package_assignments.status, not tour_packages.status.
-- So the anonymous join in TourPackages.tsx always returns tour_packages: null.
--
-- This policy lets any user (including anonymous) read a tour_package if ANY of its
-- package_assignments is currently published. It also fixes TourPackageDetail.tsx
-- which fetches tour_packages directly by ID.

CREATE POLICY "Public can view packages with published assignments"
ON public.tour_packages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.package_assignments
    WHERE package_assignments.package_id = tour_packages.id
      AND package_assignments.status = 'published'
  )
);
