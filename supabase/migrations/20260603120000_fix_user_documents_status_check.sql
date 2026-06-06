-- Drop the outdated check constraint on verification_status / status
ALTER TABLE public.user_documents
  DROP CONSTRAINT IF EXISTS user_documents_verification_status_check,
  DROP CONSTRAINT IF EXISTS user_documents_status_check;

-- Add the corrected check constraint for the status column
ALTER TABLE public.user_documents
  ADD CONSTRAINT user_documents_status_check
  CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 're_upload_requested'));
