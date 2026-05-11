CREATE TABLE IF NOT EXISTS public.host_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name text,
  business_type text,
  gst_number text,
  bank_account_holder text,
  bank_account_number text,
  bank_ifsc text,
  aadhaar_last_four text,
  pan_number text,
  service_types text[],
  address text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.host_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own host profile" ON public.host_profiles;
CREATE POLICY "Users can view their own host profile"
  ON public.host_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own host profile" ON public.host_profiles;
CREATE POLICY "Users can insert their own host profile"
  ON public.host_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own host profile" ON public.host_profiles;
CREATE POLICY "Users can update their own host profile"
  ON public.host_profiles FOR UPDATE
  USING (auth.uid() = id);
