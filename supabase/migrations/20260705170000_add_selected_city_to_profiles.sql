-- Add selected_city to traveller profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selected_city TEXT
    CHECK (selected_city IN ('hyderabad', 'bangalore'));

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_profiles_selected_city ON public.profiles(selected_city);

