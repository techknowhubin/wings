-- ============================================================
-- Phase 7: Storage Security
-- Secure all buckets — KYC must be private with signed URLs only
-- ============================================================

-- ─── Make KYC/document bucket private ────────────────────────
UPDATE storage.buckets
SET public = false
WHERE name IN ('user-documents', 'kyc-documents');

-- ─── Make listing-images public (safe for SEO/display) ───────
UPDATE storage.buckets
SET public = true
WHERE name = 'listing-images';

-- ─── Make profiles bucket public ─────────────────────────────
UPDATE storage.buckets
SET public = true
WHERE name = 'profiles';

-- ─── Storage RLS: user-documents bucket ──────────────────────
-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own documents"    ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents"      ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all documents"           ON storage.objects;

-- Drop all potential existing policies on storage.objects
DROP POLICY IF EXISTS "user_docs_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "user_docs_select_own" ON storage.objects;
DROP POLICY IF EXISTS "user_docs_no_delete" ON storage.objects;
DROP POLICY IF EXISTS "user_docs_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "user_docs_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "listing_images_insert_host" ON storage.objects;
DROP POLICY IF EXISTS "listing_images_select_public" ON storage.objects;
DROP POLICY IF EXISTS "listing_images_delete_host" ON storage.objects;
DROP POLICY IF EXISTS "profiles_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "profiles_select_public" ON storage.objects;
DROP POLICY IF EXISTS "profiles_delete_own" ON storage.objects;

-- Users can upload only to their own folder: user-documents/{user_id}/
CREATE POLICY "user_docs_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_account_active(auth.uid())
  );

-- Users can view only their own documents
CREATE POLICY "user_docs_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users cannot delete KYC documents
CREATE POLICY "user_docs_no_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND false  -- nobody can delete via RLS — only service role
  );

-- Admins can view all KYC documents
CREATE POLICY "user_docs_admin_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "user_docs_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'user-documents'
    AND public.has_role(auth.uid(), 'admin')
  );

-- ─── Storage RLS: listing-images bucket ──────────────────────
-- Hosts can upload to their own folder: listing-images/{user_id}/
CREATE POLICY "listing_images_insert_host"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'host')
  );

-- Anyone can view listing images (public bucket)
CREATE POLICY "listing_images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

-- Hosts can delete their own images
CREATE POLICY "listing_images_delete_host"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'host')
  );

-- ─── Storage RLS: profiles bucket ────────────────────────────
CREATE POLICY "profiles_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profiles'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "profiles_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profiles');

CREATE POLICY "profiles_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profiles'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
