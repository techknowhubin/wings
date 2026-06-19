-- Create all fleet tables from scratch
-- Run this in Supabase Dashboard → SQL Editor

-- 1. drivers
CREATE TABLE IF NOT EXISTS drivers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_name             TEXT NOT NULL,
  mobile                  TEXT,
  email                   TEXT,
  dob                     DATE,
  gender                  TEXT,
  address                 TEXT,
  city                    TEXT,
  state                   TEXT,
  pin_code                TEXT,
  status                  TEXT DEFAULT 'Available',
  hub_id                  TEXT,
  hub_partner_id          UUID,
  created_by              UUID,
  is_verified             BOOLEAN DEFAULT false,
  rating                  NUMERIC DEFAULT 5.0,
  driving_experience      TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_mobile TEXT,
  operating_location      TEXT,
  remarks                 TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- 2. driver_documents
CREATE TABLE IF NOT EXISTS driver_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id        UUID REFERENCES drivers(id) ON DELETE CASCADE,
  license_number   TEXT,
  license_expiry   DATE,
  aadhaar_number   TEXT,
  pan_number       TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 3. vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_name      TEXT,
  vehicle_type      TEXT DEFAULT 'Sedan',
  vehicle_number    TEXT,
  vehicle_brand     TEXT,
  vehicle_model     TEXT,
  seating_capacity  INTEGER DEFAULT 4,
  status            TEXT DEFAULT 'Available',
  hub_id            TEXT,
  hub_partner_id    UUID,
  created_by        UUID,
  vehicle_year      TEXT,
  fuel_type         TEXT,
  vehicle_color     TEXT,
  boot_space        TEXT,
  operating_location TEXT,
  service_offerings TEXT[],
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- 4. vehicle_documents
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id        UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  rc_number         TEXT,
  rc_expiry         DATE,
  insurance_number  TEXT,
  insurance_expiry  DATE,
  permit_number     TEXT,
  permit_expiry     DATE,
  fitness_expiry    DATE,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 5. hub_partner_drivers (link table)
CREATE TABLE IF NOT EXISTS hub_partner_drivers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id          TEXT,
  hub_partner_id  UUID,
  driver_id       UUID REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  created_by      UUID,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE drivers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_documents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_partner_drivers ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "auth_all_drivers"             ON drivers             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_driver_documents"    ON driver_documents    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_vehicles"            ON vehicles            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_vehicle_documents"   ON vehicle_documents   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_hub_partner_drivers" ON hub_partner_drivers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
