-- Extra fields for intelligent Excel import (drivers & vehicles)
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS driving_experience TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_mobile TEXT,
  ADD COLUMN IF NOT EXISTS remarks TEXT;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vehicle_year TEXT,
  ADD COLUMN IF NOT EXISTS fuel_type TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_color TEXT,
  ADD COLUMN IF NOT EXISTS boot_space TEXT,
  ADD COLUMN IF NOT EXISTS operating_location TEXT,
  ADD COLUMN IF NOT EXISTS service_offerings TEXT[];
