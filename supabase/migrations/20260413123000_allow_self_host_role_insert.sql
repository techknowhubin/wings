-- Allow authenticated users to add their own host role during onboarding.
CREATE POLICY "Users can insert their own host role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND role = 'host'
);
