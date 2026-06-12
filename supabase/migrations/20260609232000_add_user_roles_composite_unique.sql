CREATE OR REPLACE FUNCTION public.ensure_user_roles_unique()
RETURNS trigger AS $$
BEGIN
  -- No-op function placeholder for future use.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add composite unique constraint on (user_id, role)
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
