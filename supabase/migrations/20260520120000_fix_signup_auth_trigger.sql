-- Fix handle_new_user trigger to properly handle Email, WhatsApp, and Social Signups

-- Drop the existing flawed triggers
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Re-create the function logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_role public.app_role;
    is_confirmed BOOLEAN;
BEGIN
    -- A user is considered confirmed if:
    -- 1. They confirmed their email (email_confirmed_at IS NOT NULL)
    -- 2. They confirmed their phone (phone_confirmed_at IS NOT NULL)
    -- 3. They signed up via a social provider (raw_app_meta_data->>'provider' is not email or phone)
    is_confirmed := (NEW.email_confirmed_at IS NOT NULL) OR 
                    (NEW.phone_confirmed_at IS NOT NULL) OR 
                    (NEW.raw_app_meta_data->>'provider' IS NOT NULL AND NEW.raw_app_meta_data->>'provider' NOT IN ('email', 'phone'));

    IF is_confirmed THEN
        
        -- Determine role from metadata, default to 'user'
        target_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user')::public.app_role;

        -- Create profile (upsert to handle cases where it might exist)
        INSERT INTO public.profiles (id, full_name, phone)
        VALUES (
            NEW.id, 
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), 
            COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone)
        )
        ON CONFLICT (id) DO UPDATE 
        SET 
            full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
            phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
        
        -- Create role (upsert or do nothing)
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, target_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the robust trigger to observe confirmation changes
CREATE TRIGGER on_auth_user_confirmed
  AFTER INSERT OR UPDATE OF email_confirmed_at, phone_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
