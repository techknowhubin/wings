-- RLS INSERT/UPDATE policies for fleet import
-- Run this in Supabase Dashboard → SQL Editor

-- vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_insert_vehicles" ON vehicles;
CREATE POLICY "hub_insert_vehicles" ON vehicles
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "hub_update_vehicles" ON vehicles;
CREATE POLICY "hub_update_vehicles" ON vehicles
  FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "hub_select_vehicles" ON vehicles;
CREATE POLICY "hub_select_vehicles" ON vehicles
  FOR SELECT TO authenticated
  USING (true);

-- vehicle_documents
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_insert_vehicle_docs" ON vehicle_documents;
CREATE POLICY "hub_insert_vehicle_docs" ON vehicle_documents
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "hub_select_vehicle_docs" ON vehicle_documents;
CREATE POLICY "hub_select_vehicle_docs" ON vehicle_documents
  FOR SELECT TO authenticated
  USING (true);

-- drivers
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_insert_drivers" ON drivers;
CREATE POLICY "hub_insert_drivers" ON drivers
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "hub_update_drivers" ON drivers;
CREATE POLICY "hub_update_drivers" ON drivers
  FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "hub_select_drivers" ON drivers;
CREATE POLICY "hub_select_drivers" ON drivers
  FOR SELECT TO authenticated
  USING (true);

-- driver_documents
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_insert_driver_docs" ON driver_documents;
CREATE POLICY "hub_insert_driver_docs" ON driver_documents
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "hub_select_driver_docs" ON driver_documents;
CREATE POLICY "hub_select_driver_docs" ON driver_documents
  FOR SELECT TO authenticated
  USING (true);

-- hub_partner_drivers
ALTER TABLE hub_partner_drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hub_insert_hpd" ON hub_partner_drivers;
CREATE POLICY "hub_insert_hpd" ON hub_partner_drivers
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "hub_select_hpd" ON hub_partner_drivers;
CREATE POLICY "hub_select_hpd" ON hub_partner_drivers
  FOR SELECT TO authenticated
  USING (true);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
