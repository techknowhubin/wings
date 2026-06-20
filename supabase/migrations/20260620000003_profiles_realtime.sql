-- Enable Supabase Realtime for the profiles table so the client-side
-- account-watchdog (in AuthContext) can receive DELETE events instantly
-- when an admin removes a user, triggering an immediate forced logout.

DO $$
BEGIN
  -- Only add if not already a member of the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END;
$$;
