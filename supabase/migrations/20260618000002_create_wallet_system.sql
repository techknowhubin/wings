-- 1. Create wallet settings
CREATE TABLE IF NOT EXISTS wallet_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_bonus NUMERIC(10, 2) DEFAULT 1000.00,
  referral_bonus NUMERIC(10, 2) DEFAULT 500.00,
  expiry_days INTEGER DEFAULT 90,
  max_redemption_percentage NUMERIC(5, 2) DEFAULT 10.00,
  program_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one row exists for settings
CREATE UNIQUE INDEX IF NOT EXISTS wallet_settings_single_row ON wallet_settings ((1));

-- Insert default settings
INSERT INTO wallet_settings (signup_bonus, referral_bonus, expiry_days, max_redemption_percentage, program_enabled)
VALUES (1000.00, 500.00, 90, 10.00, true)
ON CONFLICT DO NOTHING;

-- 2. Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance NUMERIC(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
  lifetime_earned NUMERIC(10, 2) DEFAULT 0.00,
  lifetime_redeemed NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create wallet_transactions table
DO $$ BEGIN CREATE TYPE wallet_transaction_type AS ENUM (
  'signup_bonus', 'referral_reward', 'admin_credit', 'admin_deduction',
  'booking_redemption', 'expired_credits', 'promotional_credits'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE wallet_transaction_status AS ENUM (
  'pending', 'completed', 'failed', 'cancelled'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type wallet_transaction_type NOT NULL,
  amount NUMERIC(10, 2) NOT NULL, -- Can be negative for deductions
  status wallet_transaction_status DEFAULT 'completed',
  source TEXT, -- e.g., 'admin', 'booking_checkout', 'referral_system'
  reference_id UUID, -- Links to bookings.id or referrals.id
  expiry_date TIMESTAMPTZ, -- For earned credits
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create referrals table
DO $$ BEGIN CREATE TYPE referral_status AS ENUM ('pending', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  reward_amount NUMERIC(10, 2) NOT NULL,
  status referral_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_user_id) -- A user can only be referred once
);

-- Add referral code to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Create function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(user_id UUID) RETURNS TEXT AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INT := 0;
  code_exists BOOLEAN;
BEGIN
  base_code := 'WING' || UPPER(SUBSTRING(REPLACE(user_id::TEXT, '-', ''), 1, 6));
  final_code := base_code;
  
  LOOP
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = final_code) INTO code_exists;
    IF NOT code_exists THEN
      RETURN final_code;
    END IF;
    counter := counter + 1;
    final_code := base_code || counter::TEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Atomic RPC function to process wallet transactions
CREATE OR REPLACE FUNCTION process_wallet_transaction(
  p_user_id UUID,
  p_type wallet_transaction_type,
  p_amount NUMERIC,
  p_source TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
  v_transaction_id UUID;
  v_expiry_days INT;
  v_expiry_date TIMESTAMPTZ := NULL;
BEGIN
  -- Get wallet ID
  SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  -- Ensure sufficient balance for deductions
  IF p_amount < 0 THEN
    IF (SELECT balance FROM wallets WHERE id = v_wallet_id) + p_amount < 0 THEN
      RAISE EXCEPTION 'Insufficient balance in wallet';
    END IF;
  ELSE
    -- If credits are earned, set expiry date
    IF p_type IN ('signup_bonus', 'referral_reward', 'promotional_credits', 'admin_credit') THEN
      SELECT expiry_days INTO v_expiry_days FROM wallet_settings LIMIT 1;
      v_expiry_date := NOW() + (v_expiry_days || ' days')::INTERVAL;
    END IF;
  END IF;

  -- Insert transaction
  -- Cast reference_id carefully
  INSERT INTO wallet_transactions (wallet_id, type, amount, status, source, reference_id, expiry_date)
  VALUES (v_wallet_id, p_type, p_amount, 'completed', p_source, 
    CASE WHEN p_reference_id IS NOT NULL THEN p_reference_id::UUID ELSE NULL END, 
    v_expiry_date)
  RETURNING id INTO v_transaction_id;

  -- Update wallet balances
  IF p_amount > 0 THEN
    UPDATE wallets
    SET balance = balance + p_amount,
        lifetime_earned = lifetime_earned + p_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id;
  ELSE
    UPDATE wallets
    SET balance = balance + p_amount,
        lifetime_redeemed = lifetime_redeemed + ABS(p_amount),
        updated_at = NOW()
    WHERE id = v_wallet_id;
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger to create wallet and referral code on signup
CREATE OR REPLACE FUNCTION handle_new_user_wallet() RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_signup_bonus NUMERIC;
  v_program_enabled BOOLEAN;
BEGIN
  -- Generate referral code
  v_referral_code := generate_referral_code(NEW.id);
  
  -- Update profile with referral code
  UPDATE profiles SET referral_code = v_referral_code WHERE id = NEW.id;

  -- Create wallet
  INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 0);

  -- Check if signup bonus is enabled
  SELECT signup_bonus, program_enabled INTO v_signup_bonus, v_program_enabled FROM wallet_settings LIMIT 1;

  IF v_program_enabled AND v_signup_bonus > 0 THEN
    PERFORM process_wallet_transaction(
      NEW.id,
      'signup_bonus',
      v_signup_bonus,
      'system',
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_wallet ON profiles;
CREATE TRIGGER on_profile_created_wallet
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_wallet();

-- 7. RLS Policies
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_settings ENABLE ROW LEVEL SECURITY;

-- Wallets: Users can read their own, Admins can read all, update all
DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage wallets" ON wallets;
CREATE POLICY "Admins can manage wallets" ON wallets TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Transactions: Users can read their own
DROP POLICY IF EXISTS "Users can view own transactions" ON wallet_transactions;
CREATE POLICY "Users can view own transactions" ON wallet_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM wallets WHERE wallets.id = wallet_transactions.wallet_id AND wallets.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Admins can view all transactions" ON wallet_transactions;
CREATE POLICY "Admins can view all transactions" ON wallet_transactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Referrals: Users can view their own referrals
DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;
CREATE POLICY "Users can view own referrals" ON referrals FOR SELECT USING (
  referrer_id = auth.uid() OR referred_user_id = auth.uid()
);
DROP POLICY IF EXISTS "Admins can view all referrals" ON referrals;
CREATE POLICY "Admins can view all referrals" ON referrals FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Wallet settings: Anyone can read, admins can update
DROP POLICY IF EXISTS "Anyone can read wallet settings" ON wallet_settings;
CREATE POLICY "Anyone can read wallet settings" ON wallet_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can update wallet settings" ON wallet_settings;
CREATE POLICY "Admins can update wallet settings" ON wallet_settings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 8. Backfill existing profiles
DO $$
DECLARE
  rec RECORD;
  v_referral_code TEXT;
BEGIN
  FOR rec IN SELECT id FROM profiles WHERE id NOT IN (SELECT user_id FROM wallets) LOOP
    v_referral_code := generate_referral_code(rec.id);
    UPDATE profiles SET referral_code = v_referral_code WHERE id = rec.id;
    INSERT INTO wallets (user_id, balance) VALUES (rec.id, 0);
  END LOOP;
END;
$$;
