-- Fix user-to-user referral system end-to-end
-- 1. Store referred_by from signup metadata into profiles.referral_source
-- 2. Award ₹500 to referrer when a referred user's wallet is created

-- Update handle_new_user to capture referred_by from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    target_role public.app_role;
    is_confirmed BOOLEAN;
    v_referred_by TEXT;
BEGIN
    is_confirmed := (NEW.email_confirmed_at IS NOT NULL) OR
                    (NEW.phone_confirmed_at IS NOT NULL) OR
                    (NEW.raw_app_meta_data->>'provider' IS NOT NULL AND NEW.raw_app_meta_data->>'provider' NOT IN ('email', 'phone'));

    IF is_confirmed THEN
        target_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user')::public.app_role;
        v_referred_by := UPPER(TRIM(NEW.raw_user_meta_data->>'referred_by'));

        INSERT INTO public.profiles (id, full_name, phone, referral_source)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
            COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
            CASE WHEN v_referred_by ~ '^WING[A-Z0-9]{6,}$' THEN v_referred_by ELSE NULL END
        )
        ON CONFLICT (id) DO UPDATE
        SET
            full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
            phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
            referral_source = COALESCE(public.profiles.referral_source, EXCLUDED.referral_source);

        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, target_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update handle_new_user_wallet to award referral bonus
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet() RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_signup_bonus NUMERIC;
  v_referral_bonus NUMERIC;
  v_program_enabled BOOLEAN;
  v_referral_source TEXT;
  v_referrer_id UUID;
  v_rows_inserted INT;
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

  -- Handle referral reward
  IF v_program_enabled AND v_referral_bonus > 0 THEN
    -- Get referral_source from the new user's profile
    SELECT referral_source INTO v_referral_source FROM profiles WHERE id = NEW.id;

    IF v_referral_source IS NOT NULL AND v_referral_source ~ '^WING[A-Z0-9]{6,}$' THEN
      -- Find referrer (must not be the same user)
      SELECT id INTO v_referrer_id
      FROM profiles
      WHERE referral_code = v_referral_source
        AND id <> NEW.id
      LIMIT 1;

      IF v_referrer_id IS NOT NULL THEN
        -- Prevent duplicate referral reward (UNIQUE on referred_user_id)
        INSERT INTO referrals (referrer_id, referred_user_id, referral_code, reward_amount, status)
        VALUES (v_referrer_id, NEW.id, v_referral_source, v_referral_bonus, 'completed')
        ON CONFLICT (referred_user_id) DO NOTHING;

        -- Only award if the insert succeeded (i.e., no existing record)
        GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;
        IF v_rows_inserted > 0 THEN
          PERFORM process_wallet_transaction(
            v_referrer_id, 'referral_reward', v_referral_bonus, 'referral_system', NULL
          );
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (no-op if already exists with same definition)
DROP TRIGGER IF EXISTS on_profile_created_wallet ON profiles;
CREATE TRIGGER on_profile_created_wallet
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_wallet();
