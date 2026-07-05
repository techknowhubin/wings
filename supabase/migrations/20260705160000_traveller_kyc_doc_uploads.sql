-- Traveller KYC document photo uploads
-- Bucket: traveller-kyc-docs (private, anon upload allowed for public QR form)

INSERT INTO storage.buckets (id, name, public)
VALUES ('traveller-kyc-docs', 'traveller-kyc-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Anyone (anon or authenticated) can upload to this bucket (public QR form)
DROP POLICY IF EXISTS "traveller_kyc_docs_insert" ON storage.objects;
CREATE POLICY "traveller_kyc_docs_insert"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'traveller-kyc-docs');

-- Only authenticated users (admin/host) can read
DROP POLICY IF EXISTS "traveller_kyc_docs_select" ON storage.objects;
CREATE POLICY "traveller_kyc_docs_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'traveller-kyc-docs');

-- Nobody can delete via RLS
DROP POLICY IF EXISTS "traveller_kyc_docs_no_delete" ON storage.objects;
CREATE POLICY "traveller_kyc_docs_no_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'traveller-kyc-docs' AND false);

-- Update get_host_traveller_kyc to return uploaded_documents for admins
DROP FUNCTION IF EXISTS public.get_host_traveller_kyc(UUID);

CREATE OR REPLACE FUNCTION public.get_host_traveller_kyc(p_host_id UUID DEFAULT NULL)
RETURNS TABLE (
  id                  UUID,
  host_id             UUID,
  full_name           TEXT,
  mobile              TEXT,
  email               TEXT,
  aadhaar             TEXT,
  pan                 TEXT,
  driving_licence     TEXT,
  address             TEXT,
  emergency_contact   JSONB,
  uploaded_documents  JSONB,
  verification_status TEXT,
  created_at          TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT p.role::TEXT INTO v_caller_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_caller_role = 'admin' THEN
    RETURN QUERY
      SELECT kyc.id, kyc.host_id, kyc.full_name,
             kyc.mobile, kyc.email,
             kyc.aadhaar, kyc.pan, kyc.driving_licence, kyc.address,
             kyc.emergency_contact, kyc.uploaded_documents,
             kyc.verification_status, kyc.created_at
      FROM public.traveller_kyc kyc
      WHERE (p_host_id IS NULL OR kyc.host_id = p_host_id)
      ORDER BY kyc.created_at DESC;

  ELSIF v_caller_role = 'host' THEN
    RETURN QUERY
      SELECT
        kyc.id, kyc.host_id, kyc.full_name,
        'XXXXXXXX' || RIGHT(kyc.mobile, 4),
        kyc.email,
        CASE WHEN kyc.aadhaar IS NOT NULL AND length(kyc.aadhaar) >= 4
             THEN 'XXXX XXXX ' || RIGHT(regexp_replace(kyc.aadhaar, '\s', '', 'g'), 4)
             ELSE kyc.aadhaar END,
        CASE WHEN kyc.pan IS NOT NULL AND length(kyc.pan) >= 4
             THEN 'XXXXXX' || RIGHT(kyc.pan, 4)
             ELSE kyc.pan END,
        CASE WHEN kyc.driving_licence IS NOT NULL AND length(kyc.driving_licence) >= 4
             THEN 'XXXXXXXX' || RIGHT(kyc.driving_licence, 4)
             ELSE kyc.driving_licence END,
        NULL::TEXT,
        kyc.emergency_contact,
        NULL::JSONB,  -- hosts do not see uploaded document images
        kyc.verification_status, kyc.created_at
      FROM public.traveller_kyc kyc
      WHERE kyc.host_id = auth.uid()
      ORDER BY kyc.created_at DESC;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_host_traveller_kyc(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_host_traveller_kyc(UUID) TO authenticated;
