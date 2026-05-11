-- Link-in-Bio pages for hosts
CREATE TABLE IF NOT EXISTS public.link_in_bio_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.link_in_bio_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view their own link-in-bio page"
ON public.link_in_bio_pages
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Public can view active link-in-bio by slug"
ON public.link_in_bio_pages
FOR SELECT
USING (is_active = true);

CREATE POLICY "Hosts can create their own link-in-bio page"
ON public.link_in_bio_pages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hosts can update their own link-in-bio page"
ON public.link_in_bio_pages
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Hosts can delete their own link-in-bio page"
ON public.link_in_bio_pages
FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_link_in_bio_pages_user_id ON public.link_in_bio_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_link_in_bio_pages_slug ON public.link_in_bio_pages(slug);

CREATE TRIGGER update_link_in_bio_pages_updated_at
BEFORE UPDATE ON public.link_in_bio_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
