-- Fix referral capture: update on_auth_user_confirmed() (the actual trigger function)
-- to read referred_by from signup metadata and store it in profiles.referral_source.
-- Also update handle_new_user_wallet() to read referral_source directly from NEW.

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

    v_role := NEW.raw_user_meta_data->>'role';
    IF v_role IS NULL OR v_role NOT IN ('user', 'host', 'admin', 'moderator', 'hub_partner', 'driver_partner') THEN
      RAISE EXCEPTION 'A valid role is required for registration';
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

    v_role := NEW.raw_user_meta_data->>'role';
    IF v_role IS NULL OR v_role NOT IN ('user', 'host', 'admin', 'moderator', 'hub_partner', 'driver_partner') THEN
      RAISE EXCEPTION 'A valid role is required for registration';
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

-- Update handle_new_user_wallet to use NEW.referral_source directly
-- (the profile row being inserted already has referral_source set by on_auth_user_confirmed)
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet() RETURNS TRIGGER AS $$
DECLARE
  v_referral_code   TEXT;
  v_signup_bonus    NUMERIC;
  v_referral_bonus  NUMERIC;
  v_program_enabled BOOLEAN;
  v_referrer_id     UUID;
  v_rows_inserted   INT;
BEGIN
  -- Generate referral code for the new user
  v_referral_code := generate_referral_code(NEW.id);
  UPDATE profiles SET referral_code = v_referral_code WHERE id = NEW.id;

  -- Create wallet
  INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 0);

  -- Load settings
  SELECT signup_bonus, referral_bonus, program_enabled
  INTO v_signup_bonus, v_referral_bonus, v_program_enabled
  FROM wallet_settings LIMIT 1;

  -- Award signup bonus
  IF v_program_enabled AND v_signup_bonus > 0 THEN
    PERFORM process_wallet_transaction(
      NEW.id, 'signup_bonus', v_signup_bonus, 'system', NULL
    );
  END IF;

  -- Handle referral reward using NEW.referral_source directly
  IF v_program_enabled AND v_referral_bonus > 0
     AND NEW.referral_source IS NOT NULL
     AND NEW.referral_source ~ '^WING[A-Z0-9]{6,}$' THEN

    -- Find referrer (must not be the same user)
    SELECT id INTO v_referrer_id
    FROM profiles
    WHERE referral_code = NEW.referral_source
      AND id <> NEW.id
    LIMIT 1;

    IF v_referrer_id IS NOT NULL THEN
      -- Prevent duplicate reward (UNIQUE on referred_user_id)
      INSERT INTO referrals (referrer_id, referred_user_id, referral_code, reward_amount, status)
      VALUES (v_referrer_id, NEW.id, NEW.referral_source, v_referral_bonus, 'completed')
      ON CONFLICT (referred_user_id) DO NOTHING;

      GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;
      IF v_rows_inserted > 0 THEN
        PERFORM process_wallet_transaction(
          v_referrer_id, 'referral_reward', v_referral_bonus, 'referral_system', NULL
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_wallet ON profiles;
CREATE TRIGGER on_profile_created_wallet
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_wallet();
