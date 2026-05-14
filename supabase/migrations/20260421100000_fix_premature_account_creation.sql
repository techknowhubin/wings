-- This migration fixes the issue where accounts (profiles/roles) were created 
-- before email confirmation. It also ensures the correct role is assigned 
-- based on the metadata provided during signup.

-- 1. Drop the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Update the function logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_role public.app_role;
BEGIN
    -- Only proceed if the user is confirmed
    -- (email_confirmed_at is present and either it was just inserted or it was previously null)
    IF (NEW.email_confirmed_at IS NOT NULL) AND (TG_OP = 'INSERT' OR OLD.email_confirmed_at IS NULL) THEN
        
        -- Determine role from metadata, default to 'user'
        target_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user')::public.app_role;

        -- Create profile
        INSERT INTO public.profiles (id, full_name)
        VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
        ON CONFLICT (id) DO UPDATE 
        SET full_name = EXCLUDED.full_name;
        
        -- Create role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, target_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Re-create the trigger to handle both new signups (social) and confirmations (email)
CREATE TRIGGER on_auth_user_confirmed
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
