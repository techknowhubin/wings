-- Blog CMS Schema Additions
-- Run in Supabase SQL Editor

-- 1. Add new columns to blog_posts table
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS meta_title        TEXT,
  ADD COLUMN IF NOT EXISTS meta_description  TEXT,
  ADD COLUMN IF NOT EXISTS meta_keywords     TEXT,
  ADD COLUMN IF NOT EXISTS author_name       TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS views_count       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reading_time      INTEGER DEFAULT 1;

-- Add 'scheduled' and 'archived' to status if not already present
ALTER TABLE public.blog_posts
  DROP CONSTRAINT IF EXISTS blog_posts_status_check;

ALTER TABLE public.blog_posts
  ADD CONSTRAINT blog_posts_status_check
  CHECK (status IN ('draft', 'published', 'scheduled', 'archived'));

-- 2. Create blog-images storage bucket (run if not exists)
-- Do this in Supabase Dashboard → Storage → New Bucket
-- Name: blog-images, Public: true

-- 3. Storage policy for blog-images (run after creating bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read blog images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

CREATE POLICY "Authenticated upload blog images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'blog-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete blog images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'blog-images' AND auth.uid() IS NOT NULL);

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category_id);
