-- Create centralized airports table for configurable airports
CREATE TABLE IF NOT EXISTS public.airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  latitude NUMERIC(10, 6) NOT NULL,
  longitude NUMERIC(10, 6) NOT NULL,
  place_id TEXT NOT NULL,
  geofence_radius_meters NUMERIC DEFAULT 3000,
  included_distance_km NUMERIC DEFAULT 35,
  base_fares JSONB NOT NULL, -- e.g. {"Sedan": 1099, "MUV": 1699, "SUV": 2299}
  extra_km_rates JSONB NOT NULL, -- e.g. {"Sedan": 12, "MUV": 16, "SUV": 22}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (public & authenticated)
CREATE POLICY "Allow public read access to airports" ON public.airports
  FOR SELECT USING (true);

-- Allow admin to write/update/delete
CREATE POLICY "Allow admin manage airports" ON public.airports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Seed default airports
INSERT INTO public.airports (name, code, latitude, longitude, place_id, geofence_radius_meters, included_distance_km, base_fares, extra_km_rates)
VALUES
  ('Rajiv Gandhi International Airport (HYD)', 'HYD', 17.2403, 78.4294, 'ChIJ76h6xLKTyzsR27R742b78gA', 3000, 35, '{"Sedan": 1099, "MUV": 1699, "SUV": 2299}', '{"Sedan": 14, "MUV": 18, "SUV": 24}'),
  ('Kempegowda International Airport (BLR)', 'BLR', 13.1986, 77.7066, 'ChIJx8sCqU0RrjsR2Z_eAEv-B4g', 3000, 35, '{"Sedan": 1299, "MUV": 1899, "SUV": 2499}', '{"Sedan": 14, "MUV": 18, "SUV": 24}'),
  ('Indira Gandhi International Airport (DEL)', 'DEL', 28.5562, 77.1000, 'ChIJj83p92QBDTQR4zQj6sM_B4o', 3000, 35, '{"Sedan": 1199, "MUV": 1799, "SUV": 2399}', '{"Sedan": 14, "MUV": 18, "SUV": 24}'),
  ('Chennai International Airport (MAA)', 'MAA', 12.9941, 80.1709, 'ChIJd_6R8FBUUjoRyRxeAEv-B4g', 3000, 35, '{"Sedan": 1099, "MUV": 1699, "SUV": 2299}', '{"Sedan": 14, "MUV": 18, "SUV": 24}'),
  ('Chhatrapati Shivaji Maharaj International Airport (BOM)', 'BOM', 19.0896, 72.8656, 'ChIJ_yS8lXv55zsR2RxeAEv-B4g', 3000, 35, '{"Sedan": 1299, "MUV": 1899, "SUV": 2499}', '{"Sedan": 14, "MUV": 18, "SUV": 24}')
ON CONFLICT (code) DO NOTHING;
