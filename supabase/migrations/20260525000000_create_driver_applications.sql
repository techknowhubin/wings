CREATE TABLE IF NOT EXISTS public.driver_applications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  mobile      text NOT NULL,
  location    text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form submission)
CREATE POLICY "public insert driver applications"
  ON public.driver_applications FOR INSERT
  WITH CHECK (true);

-- Only service role can read
CREATE POLICY "service role reads driver applications"
  ON public.driver_applications FOR SELECT
  USING (auth.role() = 'service_role');
