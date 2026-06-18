-- ============================================================
-- Hub Partner RPC Enhancements
-- ============================================================

-- RPC: get_hub_travellers
-- Fetches travellers with their email from auth.users
CREATE OR REPLACE FUNCTION public.get_hub_travellers()
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  email text,
  wing_id text,
  city text,
  state text,
  created_at timestamptz,
  total_trips int,
  kyc_status text
) AS $$
BEGIN
  -- Verify caller is a hub partner
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'hub_partner'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.phone,
    u.email::text,
    p.wing_id,
    p.city,
    p.state,
    p.created_at,
    p.total_bookings as total_trips,
    p.kyc_status
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role = 'user'
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC: search_traveller_assistance
-- Unified search across multiple tables
CREATE OR REPLACE FUNCTION public.search_traveller_assistance(search_term text)
RETURNS TABLE (
  traveller_id uuid,
  full_name text,
  phone text,
  email text,
  wing_id text,
  city text,
  created_at timestamptz,
  kyc_status text,
  matched_booking_id uuid,
  match_source text
) AS $$
BEGIN
  -- Verify caller is a hub partner
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'hub_partner'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  -- 1. Direct matches on profile or user (mobile, name, email, wing_id)
  SELECT 
    p.id as traveller_id,
    p.full_name,
    p.phone,
    u.email::text,
    p.wing_id,
    p.city,
    p.created_at,
    p.kyc_status,
    NULL::uuid as matched_booking_id,
    'Profile Match'::text as match_source
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.role = 'user' AND (
    p.phone ILIKE '%' || search_term || '%' OR
    p.full_name ILIKE '%' || search_term || '%' OR
    u.email ILIKE '%' || search_term || '%' OR
    p.wing_id ILIKE '%' || search_term || '%'
  )
  
  UNION ALL
  
  -- 2. Match on bookings ID
  SELECT 
    p.id as traveller_id,
    p.full_name,
    p.phone,
    u.email::text,
    p.wing_id,
    p.city,
    p.created_at,
    p.kyc_status,
    b.id as matched_booking_id,
    'Booking ID Match'::text as match_source
  FROM public.bookings b
  JOIN public.profiles p ON b.user_id = p.id
  JOIN auth.users u ON p.id = u.id
  WHERE CAST(b.id AS text) ILIKE '%' || search_term || '%';

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
