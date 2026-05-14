-- Fix blog_posts RLS: allow public read for published posts
-- and allow admins full CRUD access

-- 1. Enable RLS on blog_posts (in case it isn't already)
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing conflicting policies
DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_public_read" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_admin_all" ON public.blog_posts;

-- 3. Allow anyone (including anonymous/logged-out users) to READ published posts
CREATE POLICY "blog_posts_public_read"
  ON public.blog_posts
  FOR SELECT
  USING (status = 'published');

-- 4. Allow admins to SELECT all posts (draft + published)
CREATE POLICY "blog_posts_admin_select"
  ON public.blog_posts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- 5. Allow admins to INSERT new posts
CREATE POLICY "blog_posts_admin_insert"
  ON public.blog_posts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- 6. Allow admins to UPDATE posts
CREATE POLICY "blog_posts_admin_update"
  ON public.blog_posts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- 7. Allow admins to DELETE posts
CREATE POLICY "blog_posts_admin_delete"
  ON public.blog_posts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- 8. Also ensure blog_categories is readable publicly (used in JOIN)
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_categories_public_read" ON public.blog_categories;

CREATE POLICY "blog_categories_public_read"
  ON public.blog_categories
  FOR SELECT
  USING (true);
