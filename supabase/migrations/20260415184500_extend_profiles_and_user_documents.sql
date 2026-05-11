-- Migration to extend profiles and update user_documents
-- Part (a): Extend profiles table
DO $$ 
BEGIN
    -- whatsapp_number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='whatsapp_number') THEN
        ALTER TABLE public.profiles ADD COLUMN whatsapp_number text;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_whatsapp_number_key UNIQUE (whatsapp_number);
    END IF;

    -- whatsapp_verified
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='whatsapp_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN whatsapp_verified boolean DEFAULT false;
    END IF;

    -- email_verified
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN email_verified boolean DEFAULT false;
    END IF;

    -- kyc_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_status') THEN
        ALTER TABLE public.profiles ADD COLUMN kyc_status text DEFAULT 'not_started';
    ELSE
        -- Update default if it exists
        ALTER TABLE public.profiles ALTER COLUMN kyc_status SET DEFAULT 'not_started';
    END IF;

    -- FIX: Normalize existing data before adding constraint
    -- Ensure no NULL values
    UPDATE public.profiles SET kyc_status = 'not_started' WHERE kyc_status IS NULL;
    -- Ensure all values are within the allowed set, otherwise reset to 'not_started'
    UPDATE public.profiles SET kyc_status = 'not_started' 
    WHERE kyc_status NOT IN ('not_started', 'pending', 'under_review', 'approved', 'rejected', 're_upload_requested');

    -- Add kyc_status constraint
    -- First drop existing constraint if any (common in migrations)
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_kyc_status_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_kyc_status_check 
        CHECK (kyc_status IN ('not_started', 'pending', 'under_review', 'approved', 'rejected', 're_upload_requested'));

    -- wing_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='wing_id') THEN
        ALTER TABLE public.profiles ADD COLUMN wing_id text;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_wing_id_key UNIQUE (wing_id);
    END IF;

    -- wingpass_qr_data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='wingpass_qr_data') THEN
        ALTER TABLE public.profiles ADD COLUMN wingpass_qr_data text;
    END IF;

    -- onboarding_step
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='onboarding_step') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_step integer DEFAULT 0;
    END IF;

    -- onboarding_completed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='onboarding_completed') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
    END IF;

    -- referral_source
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='referral_source') THEN
        ALTER TABLE public.profiles ADD COLUMN referral_source text;
    END IF;

    -- referral_hub_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='referral_hub_id') THEN
        ALTER TABLE public.profiles ADD COLUMN referral_hub_id uuid;
    END IF;

    -- date_of_birth
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='date_of_birth') THEN
        ALTER TABLE public.profiles ADD COLUMN date_of_birth date;
    END IF;

    -- city
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='city') THEN
        ALTER TABLE public.profiles ADD COLUMN city text;
    END IF;
END $$;

-- Part (b): Update/Create user_documents table
CREATE TABLE IF NOT EXISTS public.user_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_type text,
    document_front_url text,
    document_back_url text,
    document_hash text,
    status text DEFAULT 'pending',
    submitted_at timestamptz DEFAULT now(),
    reviewed_at timestamptz,
    reviewed_by uuid,
    rejection_reason text,
    review_notes text,
    attempt_number integer DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Ensure all columns exist in user_documents if it was created before with different schema
DO $$
BEGIN
    -- Rename/Add columns to match requested schema if they differ from older migration
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='front_file_url') THEN
        ALTER TABLE public.user_documents RENAME COLUMN front_file_url TO document_front_url;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='document_front_url') THEN
        ALTER TABLE public.user_documents ADD COLUMN document_front_url text;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='back_file_url') THEN
        ALTER TABLE public.user_documents RENAME COLUMN back_file_url TO document_back_url;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='document_back_url') THEN
        ALTER TABLE public.user_documents ADD COLUMN document_back_url text;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='verification_status') THEN
        ALTER TABLE public.user_documents RENAME COLUMN verification_status TO status;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='status') THEN
        ALTER TABLE public.user_documents ADD COLUMN status text DEFAULT 'pending';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='uploaded_at') THEN
        ALTER TABLE public.user_documents RENAME COLUMN uploaded_at TO submitted_at;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='submitted_at') THEN
        ALTER TABLE public.user_documents ADD COLUMN submitted_at timestamptz DEFAULT now();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='verified_at') THEN
        ALTER TABLE public.user_documents RENAME COLUMN verified_at TO reviewed_at;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='reviewed_at') THEN
        ALTER TABLE public.user_documents ADD COLUMN reviewed_at timestamptz;
    END IF;

    -- Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='document_hash') THEN
        ALTER TABLE public.user_documents ADD COLUMN document_hash text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='reviewed_by') THEN
        ALTER TABLE public.user_documents ADD COLUMN reviewed_by uuid;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='rejection_reason') THEN
        ALTER TABLE public.user_documents ADD COLUMN rejection_reason text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='review_notes') THEN
        ALTER TABLE public.user_documents ADD COLUMN review_notes text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='attempt_number') THEN
        ALTER TABLE public.user_documents ADD COLUMN attempt_number integer DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='created_at') THEN
        ALTER TABLE public.user_documents ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_documents' AND column_name='updated_at') THEN
        ALTER TABLE public.user_documents ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Security & RLS for user_documents
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them accurately
DROP POLICY IF EXISTS "Users can view their own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON public.user_documents;
DROP POLICY IF EXISTS "Admins can update all documents" ON public.user_documents;

-- User Policy: Authenticated users can only INSERT and SELECT their own document submissions
CREATE POLICY "Users can select own documents"
  ON public.user_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON public.user_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin Policy: Users with an 'admin' role can SELECT and UPDATE all records
-- Checking against user metadata and the public.has_role helper
CREATE POLICY "Admins can select all documents"
  ON public.user_documents FOR SELECT
  USING (
    (auth.jwt() ->> 'role' = 'admin') OR 
    (public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Admins can update all documents"
  ON public.user_documents FOR UPDATE
  USING (
    (auth.jwt() ->> 'role' = 'admin') OR 
    (public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    (auth.jwt() ->> 'role' = 'admin') OR 
    (public.has_role(auth.uid(), 'admin'))
  );
