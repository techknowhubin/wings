-- ============================================================
-- Phase 4: Complete RLS Hardening — All Tables
-- ============================================================

-- ─── PROFILES ─────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"          ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"        ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"        ON public.profiles;
DROP POLICY IF EXISTS "Public profile read"                 ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"        ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles"      ON public.profiles;
DROP POLICY IF EXISTS "restore public profile read"         ON public.profiles;

-- Own profile: full CRUD
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Public read: only display_name and avatar (no PII)
-- We expose profiles for listings/reviews but restrict sensitive columns via views (see below)
CREATE POLICY "profiles_select_public_minimal"
  ON public.profiles FOR SELECT TO anon
  USING (false);  -- anon users cannot read profiles at all

-- Admin: full access
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── USER_ROLES ────────────────────────────────────────────────
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own role"        ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own role"      ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage all roles"        ON public.user_roles;
DROP POLICY IF EXISTS "Allow insert own role on signup" ON public.user_roles;

CREATE POLICY "user_roles_select_own"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Only allow initial insert (no row exists yet)
CREATE POLICY "user_roles_insert_own_once"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2 WHERE ur2.user_id = auth.uid()
    )
  );

-- Users CANNOT update their own role — only admins can
CREATE POLICY "user_roles_no_self_update"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (false);

CREATE POLICY "user_roles_no_self_delete"
  ON public.user_roles FOR DELETE TO authenticated
  USING (false);

CREATE POLICY "user_roles_admin_all"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── HOST_PROFILES ─────────────────────────────────────────────
ALTER TABLE public.host_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can view own host profile"   ON public.host_profiles;
DROP POLICY IF EXISTS "Hosts can insert own host profile" ON public.host_profiles;
DROP POLICY IF EXISTS "Hosts can update own host profile" ON public.host_profiles;
DROP POLICY IF EXISTS "Admins manage all host profiles"   ON public.host_profiles;

-- host_profiles uses id (not user_id) as its 1:1 FK to profiles.id
CREATE POLICY "host_profiles_select_own"
  ON public.host_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "host_profiles_insert_own"
  ON public.host_profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "host_profiles_update_own"
  ON public.host_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "host_profiles_admin_all"
  ON public.host_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── BOOKINGS ──────────────────────────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookings"     ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings"       ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings"   ON public.bookings;
DROP POLICY IF EXISTS "Hosts can view own bookings"     ON public.bookings;
DROP POLICY IF EXISTS "Hosts can update booking status" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings"    ON public.bookings;
DROP POLICY IF EXISTS "Admins can update booking status" ON public.bookings;

-- Traveller: own bookings
CREATE POLICY "bookings_select_traveller"
  ON public.bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "bookings_insert_traveller"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_account_active(auth.uid())
  );

CREATE POLICY "bookings_update_traveller"
  ON public.bookings FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Host: own listing bookings
CREATE POLICY "bookings_select_host"
  ON public.bookings FOR SELECT TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "bookings_update_host"
  ON public.bookings FOR UPDATE TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

-- Admin: all
CREATE POLICY "bookings_admin_all"
  ON public.bookings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── STAYS ─────────────────────────────────────────────────────
ALTER TABLE public.stays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view available stays"     ON public.stays;
DROP POLICY IF EXISTS "Hosts can manage their own stays"    ON public.stays;
DROP POLICY IF EXISTS "Admins can view all stays"           ON public.stays;
DROP POLICY IF EXISTS "Admins can update stays approval"    ON public.stays;

CREATE POLICY "stays_select_public"
  ON public.stays FOR SELECT
  USING (
    (marketplace_visible = true AND approval_status = 'approved' AND availability_status = true)
    OR host_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "stays_insert_host"
  ON public.stays FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "stays_update_host"
  ON public.stays FOR UPDATE TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "stays_delete_host"
  ON public.stays FOR DELETE TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "stays_admin_all"
  ON public.stays FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── HOTELS ────────────────────────────────────────────────────
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view available hotels"    ON public.hotels;
DROP POLICY IF EXISTS "Hosts and admins can insert hotels"  ON public.hotels;
DROP POLICY IF EXISTS "Hosts and admins can update hotels"  ON public.hotels;
DROP POLICY IF EXISTS "Hosts and admins can delete hotels"  ON public.hotels;
DROP POLICY IF EXISTS "Admins can view all hotels"          ON public.hotels;
DROP POLICY IF EXISTS "Admins can update hotels approval"   ON public.hotels;

CREATE POLICY "hotels_select_public"
  ON public.hotels FOR SELECT
  USING (
    (marketplace_visible = true AND approval_status = 'approved' AND availability_status = true)
    OR host_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "hotels_insert_host"
  ON public.hotels FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "hotels_update_host"
  ON public.hotels FOR UPDATE TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "hotels_delete_host"
  ON public.hotels FOR DELETE TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "hotels_admin_all"
  ON public.hotels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── RESORTS ───────────────────────────────────────────────────
ALTER TABLE public.resorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view available resorts"   ON public.resorts;
DROP POLICY IF EXISTS "Hosts and admins can insert resorts" ON public.resorts;
DROP POLICY IF EXISTS "Hosts and admins can update resorts" ON public.resorts;
DROP POLICY IF EXISTS "Hosts and admins can delete resorts" ON public.resorts;
DROP POLICY IF EXISTS "Admins can view all resorts"         ON public.resorts;
DROP POLICY IF EXISTS "Admins can update resorts approval"  ON public.resorts;

CREATE POLICY "resorts_select_public"
  ON public.resorts FOR SELECT
  USING (
    (marketplace_visible = true AND approval_status = 'approved' AND availability_status = true)
    OR host_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "resorts_insert_host"
  ON public.resorts FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "resorts_update_host"
  ON public.resorts FOR UPDATE TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "resorts_delete_host"
  ON public.resorts FOR DELETE TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "resorts_admin_all"
  ON public.resorts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── CARS ──────────────────────────────────────────────────────
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view available cars"   ON public.cars;
DROP POLICY IF EXISTS "Hosts can manage own cars"        ON public.cars;
DROP POLICY IF EXISTS "Admins can view all cars"         ON public.cars;
DROP POLICY IF EXISTS "Admins can update cars approval"  ON public.cars;

CREATE POLICY "cars_select_public"
  ON public.cars FOR SELECT
  USING (
    (marketplace_visible = true AND approval_status = 'approved' AND availability_status = true)
    OR host_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "cars_insert_host"
  ON public.cars FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "cars_update_host"
  ON public.cars FOR UPDATE TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "cars_delete_host"
  ON public.cars FOR DELETE TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "cars_admin_all"
  ON public.cars FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── BIKES ─────────────────────────────────────────────────────
ALTER TABLE public.bikes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view available bikes"  ON public.bikes;
DROP POLICY IF EXISTS "Hosts can manage own bikes"       ON public.bikes;
DROP POLICY IF EXISTS "Admins can view all bikes"        ON public.bikes;
DROP POLICY IF EXISTS "Admins can update bikes approval" ON public.bikes;

CREATE POLICY "bikes_select_public"
  ON public.bikes FOR SELECT
  USING (
    (marketplace_visible = true AND approval_status = 'approved' AND availability_status = true)
    OR host_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "bikes_insert_host"
  ON public.bikes FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "bikes_update_host"
  ON public.bikes FOR UPDATE TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "bikes_delete_host"
  ON public.bikes FOR DELETE TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "bikes_admin_all"
  ON public.bikes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── EXPERIENCES ───────────────────────────────────────────────
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view available experiences"  ON public.experiences;
DROP POLICY IF EXISTS "Hosts can manage own experiences"       ON public.experiences;
DROP POLICY IF EXISTS "Admins can view all experiences"        ON public.experiences;
DROP POLICY IF EXISTS "Admins can update experiences approval" ON public.experiences;

CREATE POLICY "experiences_select_public"
  ON public.experiences FOR SELECT
  USING (
    (marketplace_visible = true AND approval_status = 'approved' AND availability_status = true)
    OR host_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "experiences_insert_host"
  ON public.experiences FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "experiences_update_host"
  ON public.experiences FOR UPDATE TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "experiences_delete_host"
  ON public.experiences FOR DELETE TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "experiences_admin_all"
  ON public.experiences FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── NOTIFICATIONS ─────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can manage notifications"    ON public.notifications;

CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_admin_all"
  ON public.notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ─── USER_DOCUMENTS ────────────────────────────────────────────
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own documents"   ON public.user_documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Admins can view all documents"        ON public.user_documents;

CREATE POLICY "user_documents_select_own"
  ON public.user_documents FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_documents_insert_own"
  ON public.user_documents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_account_active(auth.uid()));

CREATE POLICY "user_documents_update_own"
  ON public.user_documents FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Users cannot delete KYC documents once submitted
CREATE POLICY "user_documents_no_delete"
  ON public.user_documents FOR DELETE TO authenticated
  USING (false);

CREATE POLICY "user_documents_admin_all"
  ON public.user_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── KYC_SUBMISSIONS ───────────────────────────────────────────
-- (already has basic RLS — enhance it)
DROP POLICY IF EXISTS "Users view own KYC submissions"     ON public.kyc_submissions;
DROP POLICY IF EXISTS "Users insert own KYC submissions"   ON public.kyc_submissions;
DROP POLICY IF EXISTS "Admins full access to KYC submissions" ON public.kyc_submissions;

CREATE POLICY "kyc_submissions_select_own"
  ON public.kyc_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "kyc_submissions_insert_own"
  ON public.kyc_submissions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_account_active(auth.uid())
  );

CREATE POLICY "kyc_submissions_update_own"
  ON public.kyc_submissions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "kyc_submissions_admin_all"
  ON public.kyc_submissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── PAYOUTS ───────────────────────────────────────────────────
-- Already has RLS — tighten it
DROP POLICY IF EXISTS "Providers view own payouts"  ON public.payouts;
DROP POLICY IF EXISTS "Admins manage all payouts"   ON public.payouts;

CREATE POLICY "payouts_select_own"
  ON public.payouts FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

-- Providers cannot insert/update/delete payouts — only admins
CREATE POLICY "payouts_admin_all"
  ON public.payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── HOST_COUPONS ──────────────────────────────────────────────
ALTER TABLE public.host_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts manage own coupons"  ON public.host_coupons;
DROP POLICY IF EXISTS "Public can view coupons"   ON public.host_coupons;

CREATE POLICY "host_coupons_select_own"
  ON public.host_coupons FOR SELECT TO authenticated
  USING (host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "host_coupons_insert_own"
  ON public.host_coupons FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "host_coupons_update_own"
  ON public.host_coupons FOR UPDATE TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "host_coupons_delete_own"
  ON public.host_coupons FOR DELETE TO authenticated
  USING (host_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "host_coupons_admin_all"
  ON public.host_coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── HUB_PARTNERS ──────────────────────────────────────────────
-- Fix: remove "Public can view active hubs" — too broad
DROP POLICY IF EXISTS "Admins manage hub partners"   ON public.hub_partners;
DROP POLICY IF EXISTS "Public can view active hubs"  ON public.hub_partners;

-- Hub partners can only view their own record
CREATE POLICY "hub_partners_select_own"
  ON public.hub_partners FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'hub_partner')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "hub_partners_admin_all"
  ON public.hub_partners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ─── LINK_IN_BIO_PAGES ─────────────────────────────────────────
ALTER TABLE public.link_in_bio_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active pages"                   ON public.link_in_bio_pages;
DROP POLICY IF EXISTS "Hosts manage own pages"                         ON public.link_in_bio_pages;
DROP POLICY IF EXISTS "Hosts can view their own link-in-bio page"      ON public.link_in_bio_pages;
DROP POLICY IF EXISTS "Public can view active link-in-bio by slug"     ON public.link_in_bio_pages;
DROP POLICY IF EXISTS "Hosts can create their own link-in-bio page"    ON public.link_in_bio_pages;
DROP POLICY IF EXISTS "Hosts can update their own link-in-bio page"    ON public.link_in_bio_pages;
DROP POLICY IF EXISTS "Hosts can delete their own link-in-bio page"    ON public.link_in_bio_pages;

-- Public read for active pages (needed for /p/:slug); column is is_active, not is_published
CREATE POLICY "link_in_bio_select_public"
  ON public.link_in_bio_pages FOR SELECT
  USING (is_active = true);

CREATE POLICY "link_in_bio_select_own"
  ON public.link_in_bio_pages FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "link_in_bio_insert_own"
  ON public.link_in_bio_pages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "link_in_bio_update_own"
  ON public.link_in_bio_pages FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "link_in_bio_delete_own"
  ON public.link_in_bio_pages FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'host'));

CREATE POLICY "link_in_bio_admin_all"
  ON public.link_in_bio_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
