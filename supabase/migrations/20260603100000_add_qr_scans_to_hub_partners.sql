-- Add qr_scans column to hub_partners
ALTER TABLE public.hub_partners ADD COLUMN IF NOT EXISTS qr_scans integer NOT NULL DEFAULT 0;

-- Function to increment partner QR scans by code (accessible by public/anonymous role)
CREATE OR REPLACE FUNCTION public.increment_partner_qr_scans_by_code(ref_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.hub_partners
  SET qr_scans = qr_scans + 1
  WHERE UPPER(referral_id) = UPPER(ref_code) OR UPPER(qr_tracking_id) = UPPER(ref_code);
END;
$$;

-- Grant execute permissions on the function to public/anon/authenticated roles
GRANT EXECUTE ON FUNCTION public.increment_partner_qr_scans_by_code(text) TO anon, authenticated, service_role;
