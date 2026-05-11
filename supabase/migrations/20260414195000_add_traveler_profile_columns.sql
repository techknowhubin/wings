-- Add specific columns for travelers and explorers to the profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS travel_styles text[],
ADD COLUMN IF NOT EXISTS dietary_requirements text,
ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS id_document_type text,
ADD COLUMN IF NOT EXISTS id_document_number text;
