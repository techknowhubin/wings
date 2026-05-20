-- Restore public profile reads required for guest-facing pages
-- (Link-in-Bio public pages, listing host snippets, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Public read basic profile'
  ) THEN
    CREATE POLICY "Public read basic profile"
      ON public.profiles
      FOR SELECT
      USING (true);
  END IF;
END $$;

