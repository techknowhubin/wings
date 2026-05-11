-- ============================================================
-- Fix: Create hotels and resorts tables early in the migration
-- sequence. These tables were referenced by later migrations
-- (20260413150000, 20260413173000, 20260413181000) but were
-- never explicitly created in the original migration chain.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  amenities JSONB DEFAULT '[]',
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  images TEXT[] DEFAULT '{}',
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  max_guests INTEGER NOT NULL DEFAULT 2,
  bedrooms INTEGER,
  bathrooms INTEGER,
  property_type TEXT,
  check_in_time TIME,
  check_out_time TIME,
  cancellation_policy TEXT,
  availability_status BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  slug TEXT UNIQUE,
  tags TEXT[] DEFAULT '{}',
  discounts JSONB,
  verified_by UUID REFERENCES auth.users(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  booking_count INTEGER DEFAULT 0,
  last_booked_at TIMESTAMPTZ
);

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.resorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  amenities JSONB DEFAULT '[]',
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  images TEXT[] DEFAULT '{}',
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  max_guests INTEGER NOT NULL DEFAULT 2,
  bedrooms INTEGER,
  bathrooms INTEGER,
  property_type TEXT,
  check_in_time TIME,
  check_out_time TIME,
  cancellation_policy TEXT,
  availability_status BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  slug TEXT UNIQUE,
  tags TEXT[] DEFAULT '{}',
  discounts JSONB,
  verified_by UUID REFERENCES auth.users(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  booking_count INTEGER DEFAULT 0,
  last_booked_at TIMESTAMPTZ
);

ALTER TABLE public.resorts ENABLE ROW LEVEL SECURITY;
