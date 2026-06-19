-- ============================================================
-- Bulk Driver & Vehicle Import Schema and Operations
-- ============================================================

-- 1. Drivers Table
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid REFERENCES public.hubs(uuid) ON DELETE CASCADE,
  hub_partner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_name text NOT NULL,
  mobile text NOT NULL UNIQUE,
  email text,
  dob date,
  gender text,
  address text,
  city text,
  state text,
  pin_code text,
  status text DEFAULT 'Available',
  rating numeric(3,2) DEFAULT 5.00,
  total_trips integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can access all drivers" ON public.drivers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Hub partners manage their own drivers" ON public.drivers FOR ALL USING (
  hub_partner_id = auth.uid()
) WITH CHECK (
  hub_partner_id = auth.uid()
);

-- 2. Driver Documents Table
CREATE TABLE IF NOT EXISTS public.driver_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE UNIQUE,
  license_number text NOT NULL UNIQUE,
  license_expiry date,
  aadhaar_number text UNIQUE,
  pan_number text UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can access all driver_documents" ON public.driver_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Hub partners manage driver_documents of their drivers" ON public.driver_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.hub_partner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.hub_partner_id = auth.uid())
);

-- 3. Vehicles Table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid REFERENCES public.hubs(uuid) ON DELETE CASCADE,
  hub_partner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_number text NOT NULL UNIQUE,
  vehicle_type text NOT NULL,
  vehicle_brand text,
  vehicle_model text,
  seating_capacity integer,
  status text DEFAULT 'Available',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can access all vehicles" ON public.vehicles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Hub partners manage their own vehicles" ON public.vehicles FOR ALL USING (
  hub_partner_id = auth.uid()
) WITH CHECK (
  hub_partner_id = auth.uid()
);

-- 4. Vehicle Documents Table
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE UNIQUE,
  rc_number text UNIQUE,
  rc_expiry date,
  insurance_number text,
  insurance_expiry date,
  permit_number text,
  permit_expiry date,
  fitness_expiry date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can access all vehicle_documents" ON public.vehicle_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Hub partners manage vehicle_documents of their vehicles" ON public.vehicle_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.hub_partner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.hub_partner_id = auth.uid())
);

-- 5. Hub Partner Drivers Table (Driver-Vehicle mapping)
CREATE TABLE IF NOT EXISTS public.hub_partner_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid REFERENCES public.hubs(uuid) ON DELETE CASCADE,
  hub_partner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (hub_id, driver_id)
);

ALTER TABLE public.hub_partner_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can access all hub_partner_drivers" ON public.hub_partner_drivers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Hub partners manage their hub_partner_drivers" ON public.hub_partner_drivers FOR ALL USING (
  hub_partner_id = auth.uid()
) WITH CHECK (
  hub_partner_id = auth.uid()
);

-- 6. Fleet Import History Table
CREATE TABLE IF NOT EXISTS public.fleet_import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_id uuid REFERENCES public.hubs(uuid) ON DELETE CASCADE,
  hub_partner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  total_records integer NOT NULL,
  successful_records integer NOT NULL,
  failed_records integer NOT NULL,
  error_log jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.fleet_import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can access all fleet_import_history" ON public.fleet_import_history FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Hub partners manage their fleet_import_history" ON public.fleet_import_history FOR ALL USING (
  hub_partner_id = auth.uid()
) WITH CHECK (
  hub_partner_id = auth.uid()
);

-- 7. Batch Import RPC Function
CREATE OR REPLACE FUNCTION public.import_fleet_batch(
  p_hub_id uuid,
  p_hub_partner_id uuid,
  p_file_name text,
  p_rows jsonb
)
RETURNS jsonb
SECURITY DEFINER
AS $$
DECLARE
  v_row jsonb;
  v_driver_id uuid;
  v_vehicle_id uuid;
  v_success_count integer := 0;
  v_failed_count integer := 0;
  v_total_count integer := 0;
  v_error_log jsonb := '[]'::jsonb;
  v_row_index integer := 0;
  
  -- Driver fields
  v_driver_name text;
  v_mobile text;
  v_email text;
  v_dob date;
  v_gender text;
  v_address text;
  v_city text;
  v_state text;
  v_pin_code text;
  v_license_number text;
  v_license_expiry date;
  v_aadhaar_number text;
  v_pan_number text;
  
  -- Vehicle fields
  v_vehicle_number text;
  v_vehicle_type text;
  v_vehicle_brand text;
  v_vehicle_model text;
  v_seating_capacity integer;
  
  -- Vehicle doc fields
  v_rc_number text;
  v_rc_expiry date;
  v_insurance_number text;
  v_insurance_expiry date;
  v_permit_number text;
  v_permit_expiry date;
  v_fitness_expiry date;
  v_status text;

  v_error_reason text;
  v_has_error boolean;
BEGIN
  -- Verify caller is the hub partner or admin
  IF auth.uid() <> p_hub_partner_id AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_total_count := jsonb_array_length(p_rows);

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_row_index := v_row_index + 1;
    v_has_error := false;
    v_error_reason := '';

    -- Parse driver info
    v_driver_name := trim(v_row->>'driver_name');
    v_mobile := trim(v_row->>'mobile');
    v_email := trim(v_row->>'email');
    v_dob := CASE WHEN v_row->>'dob' IS NOT NULL AND trim(v_row->>'dob') <> '' THEN (v_row->>'dob')::date ELSE NULL END;
    v_gender := trim(v_row->>'gender');
    v_address := trim(v_row->>'address');
    v_city := trim(v_row->>'city');
    v_state := trim(v_row->>'state');
    v_pin_code := trim(v_row->>'pin_code');
    v_status := COALESCE(NULLIF(trim(v_row->>'status'), ''), 'Available');

    -- Parse driver docs
    v_license_number := trim(v_row->>'license_number');
    v_license_expiry := CASE WHEN v_row->>'license_expiry' IS NOT NULL AND trim(v_row->>'license_expiry') <> '' THEN (v_row->>'license_expiry')::date ELSE NULL END;
    v_aadhaar_number := trim(v_row->>'aadhaar_number');
    v_pan_number := trim(v_row->>'pan_number');

    -- Parse vehicle info
    v_vehicle_number := trim(v_row->>'vehicle_number');
    v_vehicle_type := trim(v_row->>'vehicle_type');
    v_vehicle_brand := trim(v_row->>'vehicle_brand');
    v_vehicle_model := trim(v_row->>'vehicle_model');
    v_seating_capacity := CASE WHEN v_row->>'seating_capacity' IS NOT NULL AND trim(v_row->>'seating_capacity') <> '' THEN (v_row->>'seating_capacity')::integer ELSE NULL END;

    -- Parse vehicle docs
    v_rc_number := trim(v_row->>'rc_number');
    v_rc_expiry := CASE WHEN v_row->>'rc_expiry' IS NOT NULL AND trim(v_row->>'rc_expiry') <> '' THEN (v_row->>'rc_expiry')::date ELSE NULL END;
    v_insurance_number := trim(v_row->>'insurance_number');
    v_insurance_expiry := CASE WHEN v_row->>'insurance_expiry' IS NOT NULL AND trim(v_row->>'insurance_expiry') <> '' THEN (v_row->>'insurance_expiry')::date ELSE NULL END;
    v_permit_number := trim(v_row->>'permit_number');
    v_permit_expiry := CASE WHEN v_row->>'permit_expiry' IS NOT NULL AND trim(v_row->>'permit_expiry') <> '' THEN (v_row->>'permit_expiry')::date ELSE NULL END;
    v_fitness_expiry := CASE WHEN v_row->>'fitness_expiry' IS NOT NULL AND trim(v_row->>'fitness_expiry') <> '' THEN (v_row->>'fitness_expiry')::date ELSE NULL END;

    -- Validation
    IF v_driver_name IS NULL OR v_driver_name = '' THEN
      v_has_error := true;
      v_error_reason := 'Driver Name is required';
    ELSIF v_mobile IS NULL OR v_mobile = '' THEN
      v_has_error := true;
      v_error_reason := 'Mobile Number is required';
    ELSIF v_license_number IS NULL OR v_license_number = '' THEN
      v_has_error := true;
      v_error_reason := 'License Number is required';
    ELSIF v_vehicle_number IS NULL OR v_vehicle_number = '' THEN
      v_has_error := true;
      v_error_reason := 'Vehicle Number is required';
    ELSIF v_vehicle_type IS NULL OR v_vehicle_type = '' THEN
      v_has_error := true;
      v_error_reason := 'Vehicle Type is required';
    END IF;

    -- Duplicate Checks
    IF NOT v_has_error THEN
      -- Check driver mobile
      IF EXISTS (SELECT 1 FROM public.drivers WHERE mobile = v_mobile) THEN
        v_has_error := true;
        v_error_reason := 'Driver Mobile Number already exists';
      -- Check driver license
      ELSIF EXISTS (SELECT 1 FROM public.driver_documents WHERE license_number = v_license_number) THEN
        v_has_error := true;
        v_error_reason := 'License Number already exists';
      -- Check driver Aadhaar
      ELSIF v_aadhaar_number IS NOT NULL AND v_aadhaar_number <> '' AND EXISTS (SELECT 1 FROM public.driver_documents WHERE aadhaar_number = v_aadhaar_number) THEN
        v_has_error := true;
        v_error_reason := 'Aadhaar Number already exists';
      -- Check vehicle number
      ELSIF EXISTS (SELECT 1 FROM public.vehicles WHERE vehicle_number = v_vehicle_number) THEN
        v_has_error := true;
        v_error_reason := 'Vehicle Number already exists';
      -- Check vehicle RC
      ELSIF v_rc_number IS NOT NULL AND v_rc_number <> '' AND EXISTS (SELECT 1 FROM public.vehicle_documents WHERE rc_number = v_rc_number) THEN
        v_has_error := true;
        v_error_reason := 'Vehicle RC Number already exists';
      END IF;
    END IF;

    -- Insert records if valid
    IF NOT v_has_error THEN
      BEGIN
        -- 1. Insert Driver
        INSERT INTO public.drivers (
          driver_name, mobile, email, dob, gender, address, city, state, pin_code, status,
          hub_id, hub_partner_id, created_by
        ) VALUES (
          v_driver_name, v_mobile, v_email, v_dob, v_gender, v_address, v_city, v_state, v_pin_code, v_status,
          p_hub_id, p_hub_partner_id, p_hub_partner_id
        ) RETURNING id INTO v_driver_id;

        -- 2. Insert Driver Documents
        INSERT INTO public.driver_documents (
          driver_id, license_number, license_expiry, aadhaar_number, pan_number
        ) VALUES (
          v_driver_id, v_license_number, v_license_expiry, v_aadhaar_number, v_pan_number
        );

        -- 3. Insert Vehicle
        INSERT INTO public.vehicles (
          vehicle_number, vehicle_type, vehicle_brand, vehicle_model, seating_capacity, status,
          hub_id, hub_partner_id, created_by
        ) VALUES (
          v_vehicle_number, v_vehicle_type, v_vehicle_brand, v_vehicle_model, v_seating_capacity, v_status,
          p_hub_id, p_hub_partner_id, p_hub_partner_id
        ) RETURNING id INTO v_vehicle_id;

        -- 4. Insert Vehicle Documents
        INSERT INTO public.vehicle_documents (
          vehicle_id, rc_number, rc_expiry, insurance_number, insurance_expiry, permit_number, permit_expiry, fitness_expiry
        ) VALUES (
          v_vehicle_id, v_rc_number, v_rc_expiry, v_insurance_number, v_insurance_expiry, v_permit_number, v_permit_expiry, v_fitness_expiry
        );

        -- 5. Insert Hub Partner Driver mapping
        INSERT INTO public.hub_partner_drivers (
          hub_id, hub_partner_id, driver_id, vehicle_id, created_by
        ) VALUES (
          p_hub_id, p_hub_partner_id, v_driver_id, v_vehicle_id, p_hub_partner_id
        );

        v_success_count := v_success_count + 1;
      EXCEPTION WHEN OTHERS THEN
        v_has_error := true;
        v_error_reason := SQLERRM;
      END;
    END IF;

    IF v_has_error THEN
      v_failed_count := v_failed_count + 1;
      v_error_log := v_error_log || jsonb_build_object(
        'row', v_row_index,
        'driver_name', COALESCE(v_driver_name, ''),
        'mobile', COALESCE(v_mobile, ''),
        'vehicle_number', COALESCE(v_vehicle_number, ''),
        'reason', v_error_reason
      );
    END IF;
  END LOOP;

  -- 6. Record Import History
  INSERT INTO public.fleet_import_history (
    hub_id, hub_partner_id, file_name, total_records, successful_records, failed_records, error_log, created_by
  ) VALUES (
    p_hub_id, p_hub_partner_id, p_file_name, v_total_count, v_success_count, v_failed_count, v_error_log, p_hub_partner_id
  );

  RETURN jsonb_build_object(
    'total', v_total_count,
    'success', v_success_count,
    'failed', v_failed_count,
    'errors', v_error_log
  );
END;
$$ LANGUAGE plpgsql;
