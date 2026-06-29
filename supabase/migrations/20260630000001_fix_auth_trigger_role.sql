-- Update on_auth_user_confirmed trigger to allow default 'user' role for phone auth
CREATE OR REPLACE FUNCTION public.on_auth_user_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role         TEXT;
  v_cleaned_meta JSONB;
  v_referred_by  TEXT;
BEGIN
  -- ── Case A: email confirmation ──────────────────────────────
  IF (
    NEW.email_confirmed_at IS NOT NULL AND
    (OLD.email_confirmed_at IS NULL OR
     OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  ) THEN

    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
    IF v_role NOT IN ('user', 'host', 'admin', 'moderator', 'hub_partner', 'driver_partner') THEN
      v_role := 'user';
    END IF;

    -- Capture referral code before metadata is stripped
    v_referred_by := UPPER(TRIM(NEW.raw_user_meta_data->>'referred_by'));

    INSERT INTO public.profiles (id, full_name, phone, role, referral_source, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      CASE
        WHEN NEW.raw_user_meta_data->>'phone' IS NULL THEN NULL
        WHEN NEW.raw_user_meta_data->>'phone' LIKE '+%'
          THEN NEW.raw_user_meta_data->>'phone'
        ELSE '+91' || regexp_replace(NEW.raw_user_meta_data->>'phone', '[^0-9]', '', 'g')
      END,
      v_role::app_role,
      CASE WHEN v_referred_by ~ '^WING[A-Z0-9]{6,}$' THEN v_referred_by ELSE NULL END,
      NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role          = EXCLUDED.role,
      full_name     = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone         = COALESCE(EXCLUDED.phone, public.profiles.phone),
      referral_source = COALESCE(public.profiles.referral_source, EXCLUDED.referral_source);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role::app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

    -- Strip PII from metadata; keep referred_by so it's still available if needed
    v_cleaned_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
      - 'full_name'
      - 'phone'
      - 'role'
      - 'phone_provider'
      - 'referred_by';

    UPDATE auth.users
    SET raw_user_meta_data = v_cleaned_meta
    WHERE id = NEW.id;

  END IF;

  -- ── Case B: phone confirmation (WhatsApp OTP) ───────────────
  IF (
    NEW.phone_confirmed_at IS NOT NULL AND
    (OLD.phone_confirmed_at IS NULL OR
     OLD.phone_confirmed_at IS DISTINCT FROM NEW.phone_confirmed_at)
  ) THEN

    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
    IF v_role NOT IN ('user', 'host', 'admin', 'moderator', 'hub_partner', 'driver_partner') THEN
      v_role := 'user';
    END IF;

    v_referred_by := UPPER(TRIM(NEW.raw_user_meta_data->>'referred_by'));

    INSERT INTO public.profiles (id, phone, role, referral_source, created_at, updated_at)
    VALUES (
      NEW.id,
      CASE
        WHEN NEW.phone IS NULL THEN NULL
        WHEN NEW.phone LIKE '+%' THEN NEW.phone
        ELSE '+91' || regexp_replace(NEW.phone, '[^0-9]', '', 'g')
      END,
      v_role::app_role,
      CASE WHEN v_referred_by ~ '^WING[A-Z0-9]{6,}$' THEN v_referred_by ELSE NULL END,
      NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role          = EXCLUDED.role,
      phone         = COALESCE(EXCLUDED.phone, public.profiles.phone),
      referral_source = COALESCE(public.profiles.referral_source, EXCLUDED.referral_source);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role::app_role)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

    v_cleaned_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
      - 'phone'
      - 'phone_provider'
      - 'role'
      - 'referred_by';

    UPDATE auth.users
    SET raw_user_meta_data = v_cleaned_meta
    WHERE id = NEW.id;

  END IF;

  RETURN NEW;
END;
$$;
