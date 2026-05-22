-- ROOT CAUSE FIX: The handle_new_user trigger was creating a user_roles row for ALL
-- Google OAuth users immediately on INSERT (because Google sets email_confirmed_at at signup time).
-- This made every Google sign-in attempt look like a "registered user" to the app.
--
-- NEW BEHAVIOR:
-- * Social auth (Google/OAuth): create profiles row only (needed so onboarding UPDATE works),
--   but do NOT create user_roles. The role is assigned explicitly when onboarding completes.
-- * Email auth: create profiles + user_roles only after email is confirmed (unchanged).
-- * Phone auth: create profiles + user_roles only after phone is confirmed (unchanged).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_role public.app_role;
    auth_provider TEXT;
    is_social_auth BOOLEAN;
    is_confirmed BOOLEAN;
BEGIN
    auth_provider := NEW.raw_app_meta_data->>'provider';
    is_social_auth := auth_provider IS NOT NULL AND auth_provider NOT IN ('email', 'phone');

    -- ── Social auth (Google, etc.) ───────────────────────────────────────────────
    -- Create the profile row so that the onboarding UPDATE queries work,
    -- but do NOT create user_roles here. Role is assigned during onboarding.
    IF is_social_auth THEN
        INSERT INTO public.profiles (id, full_name, phone)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
            COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone)
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
            phone     = COALESCE(EXCLUDED.phone,     public.profiles.phone);

        -- Intentionally NO user_roles insert for social auth.
        RETURN NEW;
    END IF;

    -- ── Email / phone auth ───────────────────────────────────────────────────────
    -- Only proceed after the user has confirmed their email or phone.
    is_confirmed := (NEW.email_confirmed_at IS NOT NULL)
                 OR (NEW.phone_confirmed_at IS NOT NULL);

    IF is_confirmed THEN
        target_role := COALESCE(
            (NEW.raw_user_meta_data->>'role')::public.app_role,
            'user'::public.app_role
        );

        INSERT INTO public.profiles (id, full_name, phone)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
            COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone)
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
            phone     = COALESCE(EXCLUDED.phone,     public.profiles.phone);

        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, target_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Also fix the users-table sync trigger: skip social auth users entirely.
-- They are synced (with role) explicitly when onboarding completes.
CREATE OR REPLACE FUNCTION public.sync_auth_users_to_public_users()
RETURNS TRIGGER AS $$
DECLARE
    target_role    public.app_role;
    user_full_name text;
    mobile         text;
    auth_provider  TEXT;
    is_verified    boolean;
BEGIN
    auth_provider := NEW.raw_app_meta_data->>'provider';

    -- Skip social auth users — synced during onboarding completion.
    IF auth_provider IS NOT NULL AND auth_provider NOT IN ('email', 'phone') THEN
        RETURN NEW;
    END IF;

    is_verified := (NEW.email_confirmed_at IS NOT NULL)
               OR (NEW.phone_confirmed_at IS NOT NULL);

    IF NOT is_verified THEN
        RETURN NEW;
    END IF;

    target_role    := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'user'::public.app_role);
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
    mobile         := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, '');

    INSERT INTO public.users (id, full_name, email, mobile_number, role, is_verified, created_at, updated_at)
    VALUES (NEW.id, user_full_name, NEW.email, mobile, target_role, is_verified, now(), now())
    ON CONFLICT (id) DO UPDATE SET
        full_name     = COALESCE(EXCLUDED.full_name,      public.users.full_name),
        email         = COALESCE(EXCLUDED.email,          public.users.email),
        mobile_number = COALESCE(EXCLUDED.mobile_number,  public.users.mobile_number),
        role          = COALESCE(EXCLUDED.role,           public.users.role),
        is_verified   = public.users.is_verified OR EXCLUDED.is_verified,
        updated_at    = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
