-- Create a table specifically for user documents to support multiple doc types per user

CREATE TABLE IF NOT EXISTS public.user_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('aadhaar', 'pan', 'driving_license', 'passport', 'other')),
  document_number text,
  front_file_url text,
  back_file_url text,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'skipped')),
  uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
  verified_at timestamp with time zone,
  
  -- ensure a user only has one active document of a certain type
  UNIQUE (user_id, document_type)
);

-- RLS
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON public.user_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON public.user_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.user_documents FOR UPDATE
  USING (auth.uid() = user_id);
