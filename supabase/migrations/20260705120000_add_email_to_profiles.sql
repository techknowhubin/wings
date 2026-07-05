-- Add plain email column to profiles for WA/OTP users who supply their real email
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Index for lookup (non-unique since email_hash is the uniqueness guard)
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles (email)
  WHERE email IS NOT NULL;
