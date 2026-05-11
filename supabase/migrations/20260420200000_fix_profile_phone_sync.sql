-- Fix handle_new_user trigger to also sync phone from user_metadata into profiles.
-- This ensures WhatsApp users get their phone in public.profiles automatically,
-- making public.profiles the single source of truth for all profile data.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'   -- syncs WhatsApp phone into profiles
  )
  ON CONFLICT (id) DO NOTHING;  -- safe for any duplicate triggers

  -- Assign default 'user' role if not already assigned
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
