-- ============================================================
-- Hub Partner Profile, Bank, Document, Settings, and Team Schema
-- ============================================================

-- 1. Hub Profiles (alternate contact and code info)
CREATE TABLE IF NOT EXISTS public.hub_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  alternate_mobile text,
  hub_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.hub_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own hub profile" ON public.hub_profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all hub profiles" ON public.hub_profiles
  FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 2. Bank Details
CREATE TABLE IF NOT EXISTS public.bank_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  account_holder_name text,
  account_number text,
  ifsc_code text,
  bank_name text,
  upi_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.bank_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bank details" ON public.bank_details
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all bank details" ON public.bank_details
  FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 3. Documents
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  gst_number text,
  pan_number text,
  business_registration_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own documents" ON public.documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all documents" ON public.documents
  FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 4. Hub Settings
CREATE TABLE IF NOT EXISTS public.hub_settings (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  general_settings jsonb DEFAULT '{"time_zone": "Asia/Kolkata", "language": "en", "currency": "INR", "date_format": "dd-MMM-yyyy"}'::jsonb,
  notification_preferences jsonb DEFAULT '{"email": {"summary": true, "alert": true, "cancel": true, "settle": true}, "sms": {"alert": true, "driver": true}, "whatsapp": {"updates": true, "traveller": true, "payment": true}, "push": {"alerts": true, "tickets": true, "driver": true}}'::jsonb,
  booking_settings jsonb DEFAULT '{"auto_accept": false, "cutoff_time": "12:00", "cancellation_rules": "standard", "refund_policy": "standard"}'::jsonb,
  driver_settings jsonb DEFAULT '{"auto_assign": false, "verification_required": true, "availability_rules": "standard"}'::jsonb,
  listing_settings jsonb DEFAULT '{"auto_approve": false, "visibility": "public", "featured_priority": "normal"}'::jsonb,
  financial_settings jsonb DEFAULT '{"settlement_frequency": "Monthly", "preferred_payment_method": "Bank Transfer", "wallet_settings": {}}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.hub_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings" ON public.hub_settings
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all settings" ON public.hub_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 5. Hub Team Members
CREATE TABLE IF NOT EXISTS public.hub_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid REFERENCES public.hubs(uuid) ON DELETE CASCADE,
  hub_partner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('Operations Manager', 'Booking Executive', 'Driver Manager', 'Finance Executive', 'Support Executive')),
  permissions text[] DEFAULT ARRAY['View']::text[],
  status text DEFAULT 'Active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.hub_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hub partners manage their team members" ON public.hub_team_members
  FOR ALL USING (hub_partner_id = auth.uid()) WITH CHECK (hub_partner_id = auth.uid());

CREATE POLICY "Admins can manage all team members" ON public.hub_team_members
  FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
