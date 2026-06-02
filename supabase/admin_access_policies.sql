-- ============================================================
-- ADMIN ACCESS POLICIES
-- Run this in Supabase SQL Editor to fix "Failed to approve host"
-- ============================================================

-- Helper: is the current user an admin?
-- Admins have a row in user_roles with role = 'admin'

-- ── host_profiles ────────────────────────────────────────────
ALTER TABLE public.host_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_host_profiles" ON public.host_profiles;
DROP POLICY IF EXISTS "host_read_own_profile"      ON public.host_profiles;
DROP POLICY IF EXISTS "host_upsert_own_profile"    ON public.host_profiles;

-- Hosts can read and upsert their own profile
CREATE POLICY "host_read_own_profile" ON public.host_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "host_upsert_own_profile" ON public.host_profiles
  FOR ALL USING (auth.uid() = id);

-- Admins can do everything
CREATE POLICY "admin_manage_host_profiles" ON public.host_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── user_documents ───────────────────────────────────────────
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_user_documents" ON public.user_documents;
DROP POLICY IF EXISTS "user_manage_own_documents"   ON public.user_documents;

-- Users can manage their own documents
CREATE POLICY "user_manage_own_documents" ON public.user_documents
  FOR ALL USING (auth.uid() = user_id);

-- Admins can read and update all documents
CREATE POLICY "admin_manage_user_documents" ON public.user_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── profiles ─────────────────────────────────────────────────
-- (profiles typically already has policies — only adding admin update)
DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;

CREATE POLICY "admin_update_profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── kyc_submissions (used by HostOnboarding) ─────────────────
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_kyc_submissions" ON public.kyc_submissions;
DROP POLICY IF EXISTS "user_manage_own_kyc"          ON public.kyc_submissions;

CREATE POLICY "user_manage_own_kyc" ON public.kyc_submissions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin_manage_kyc_submissions" ON public.kyc_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
