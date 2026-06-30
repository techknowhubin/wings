-- Wing Credits v2 — functions (split from 20260702100000 because Postgres forbids
-- referencing a freshly-added enum value inside the transaction that added it).
--
-- Security model:
--   process_wallet_transaction is the ONLY function that ever writes to wallet_transactions
--   / wallets. It is now SERVICE-ROLE-ONLY (no client, not even an authenticated admin, may
--   call it directly) — every legitimate caller goes through a narrow, purpose-built
--   SECURITY DEFINER wrapper that validates exactly what that caller is allowed to do:
--     - admin_adjust_wallet            (admin-only, replaces AdminWalletManagement's old
--                                        direct RPC call to process_wallet_transaction)
--     - award_signup_credits           (trigger-only)
--     - apply_pending_referral         (self-service: a user may only apply a referral to
--                                        their own account; backs both the WhatsApp/email
--                                        trigger path and the new Google OAuth path)
--     - award_booking_milestone_credits (service-role only, called post-payment-verification)
--     - redeem_wing_credits_for_booking (service-role only; re-validates ownership, payment
--                                        status, and the 10% max-redemption rule server-side)
--     - reverse_booking_credits         (service-role only; dormant until a refund flow exists)
--
-- Previously, process_wallet_transaction was PUBLIC-executable with no internal checks,
-- meaning ANY authenticated user could call supabase.rpc('process_wallet_transaction', {...})
-- directly and mint themselves unlimited wallet balance. This migration closes that hole.

-- ════════════════════════════════════════════════════════════════
-- 1. process_wallet_transaction — add idempotency + FIFO lot consumption
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION process_wallet_transaction(
  p_user_id UUID,
  p_type wallet_transaction_type,
  p_amount NUMERIC,
  p_source TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
  v_transaction_id UUID;
  v_existing_id UUID;
  v_expiry_days INT;
  v_expiry_date TIMESTAMPTZ := NULL;
  v_remaining_to_consume NUMERIC;
  v_lot RECORD;
  v_consume NUMERIC;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM wallet_transactions WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_existing_id;
    END IF;
  END IF;

  SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  IF p_amount < 0 THEN
    IF (SELECT balance FROM wallets WHERE id = v_wallet_id) + p_amount < 0 THEN
      RAISE EXCEPTION 'Insufficient balance in wallet';
    END IF;
  ELSE
    IF p_type IN ('signup_bonus', 'referral_reward', 'promotional_credits', 'admin_credit',
                   'welcome_local_booking', 'welcome_outstation_booking',
                   'referral_local_booking', 'referral_outstation_booking') THEN
      SELECT expiry_days INTO v_expiry_days FROM wallet_settings LIMIT 1;
      v_expiry_date := NOW() + (COALESCE(v_expiry_days, 90) || ' days')::INTERVAL;
    END IF;
  END IF;

  BEGIN
    INSERT INTO wallet_transactions (wallet_id, type, amount, status, source, reference_id, expiry_date, idempotency_key)
    VALUES (v_wallet_id, p_type, p_amount, 'completed', p_source,
      CASE WHEN p_reference_id IS NOT NULL THEN p_reference_id::UUID ELSE NULL END,
      v_expiry_date, p_idempotency_key)
    RETURNING id INTO v_transaction_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_existing_id FROM wallet_transactions WHERE idempotency_key = p_idempotency_key;
    RETURN v_existing_id;
  END;

  IF p_amount > 0 THEN
    UPDATE wallets
    SET balance = balance + p_amount, lifetime_earned = lifetime_earned + p_amount, updated_at = NOW()
    WHERE id = v_wallet_id;
  ELSE
    UPDATE wallets
    SET balance = balance + p_amount, lifetime_redeemed = lifetime_redeemed + ABS(p_amount), updated_at = NOW()
    WHERE id = v_wallet_id;

    -- FIFO: consume oldest unexpired earning lots first, recording exactly how much of
    -- each lot this debit drew down (powers accurate expiry + refund-restore later).
    v_remaining_to_consume := ABS(p_amount);
    FOR v_lot IN
      SELECT wt.id,
             wt.amount - COALESCE((
               SELECT SUM(clc.amount) FROM credit_lot_consumption clc WHERE clc.lot_transaction_id = wt.id
             ), 0) AS remaining
      FROM wallet_transactions wt
      WHERE wt.wallet_id = v_wallet_id
        AND wt.status = 'completed'
        AND wt.amount > 0
        AND wt.type IN ('signup_bonus', 'referral_reward', 'admin_credit', 'promotional_credits',
                         'welcome_local_booking', 'welcome_outstation_booking',
                         'referral_local_booking', 'referral_outstation_booking')
      ORDER BY wt.created_at ASC
    LOOP
      EXIT WHEN v_remaining_to_consume <= 0;
      CONTINUE WHEN v_lot.remaining <= 0;
      v_consume := LEAST(v_lot.remaining, v_remaining_to_consume);
      INSERT INTO credit_lot_consumption (lot_transaction_id, consumption_transaction_id, amount)
      VALUES (v_lot.id, v_transaction_id, v_consume);
      v_remaining_to_consume := v_remaining_to_consume - v_consume;
    END LOOP;
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lock process_wallet_transaction down to internal/service-role use only.
REVOKE ALL ON FUNCTION process_wallet_transaction(UUID, wallet_transaction_type, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_wallet_transaction(UUID, wallet_transaction_type, NUMERIC, TEXT, TEXT, TEXT) TO service_role;

-- ════════════════════════════════════════════════════════════════
-- 2. admin_adjust_wallet — replaces AdminWalletManagement's old direct
--    call to process_wallet_transaction; enforces admin role server-side.
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION admin_adjust_wallet(
  p_user_id UUID,
  p_type wallet_transaction_type,
  p_amount NUMERIC,
  p_source TEXT DEFAULT 'admin'
) RETURNS UUID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins may issue manual wallet adjustments';
  END IF;
  IF p_type NOT IN ('admin_credit', 'admin_deduction') THEN
    RAISE EXCEPTION 'admin_adjust_wallet may only create admin_credit or admin_deduction transactions';
  END IF;

  RETURN process_wallet_transaction(p_user_id, p_type, p_amount, p_source, NULL, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_adjust_wallet(UUID, wallet_transaction_type, NUMERIC, TEXT) TO authenticated;

-- ════════════════════════════════════════════════════════════════
-- 3. award_signup_credits — idempotent welcome-signup bonus (trigger-only)
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION award_signup_credits(p_user_id UUID) RETURNS UUID AS $$
DECLARE
  v_amount NUMERIC;
  v_enabled BOOLEAN;
BEGIN
  SELECT signup_bonus, program_enabled INTO v_amount, v_enabled FROM wallet_settings LIMIT 1;
  IF NOT COALESCE(v_enabled, false) OR v_amount IS NULL OR v_amount <= 0 THEN
    RETURN NULL;
  END IF;

  RETURN process_wallet_transaction(
    p_user_id, 'signup_bonus', v_amount, 'system', NULL,
    'welcome_signup:' || p_user_id::TEXT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION award_signup_credits(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION award_signup_credits(UUID) TO service_role;

-- ════════════════════════════════════════════════════════════════
-- 4. apply_pending_referral — provider-agnostic referral application.
--    Same function backs the WhatsApp/email signup trigger AND the
--    Google OAuth post-login call (auth.uid() is NULL in trigger
--    context, so the self-service guard only applies to client RPC calls).
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION apply_pending_referral(p_user_id UUID, p_referral_code TEXT) RETURNS UUID AS $$
DECLARE
  v_code TEXT;
  v_referrer_id UUID;
  v_referral_id UUID;
  v_bonus NUMERIC;
  v_enabled BOOLEAN;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_code := UPPER(TRIM(COALESCE(p_referral_code, '')));
  IF v_code !~ '^WING[A-Z0-9]{6,}$' THEN
    RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM referrals WHERE referred_user_id = p_user_id) THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_referrer_id FROM profiles WHERE referral_code = v_code AND id <> p_user_id LIMIT 1;
  IF v_referrer_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT referral_bonus, program_enabled INTO v_bonus, v_enabled FROM wallet_settings LIMIT 1;
  IF NOT COALESCE(v_enabled, false) OR v_bonus IS NULL OR v_bonus <= 0 THEN
    RETURN NULL;
  END IF;

  UPDATE profiles SET referral_source = COALESCE(referral_source, v_code) WHERE id = p_user_id;

  INSERT INTO referrals (referrer_id, referred_user_id, referral_code, reward_amount, status)
  VALUES (v_referrer_id, p_user_id, v_code, v_bonus, 'completed')
  ON CONFLICT (referred_user_id) DO NOTHING
  RETURNING id INTO v_referral_id;

  IF v_referral_id IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM process_wallet_transaction(
    v_referrer_id, 'referral_reward', v_bonus, 'referral_system', NULL,
    'ref_signup:' || v_referral_id::TEXT
  );

  RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION apply_pending_referral(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_pending_referral(UUID, TEXT) TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════
-- 5. handle_new_user_wallet — delegate to the new wrapper functions
--    instead of inlining the logic (single source of truth).
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet() RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
BEGIN
  v_referral_code := generate_referral_code(NEW.id);
  UPDATE profiles SET referral_code = v_referral_code WHERE id = NEW.id;

  INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 0);

  PERFORM award_signup_credits(NEW.id);

  IF NEW.referral_source IS NOT NULL THEN
    PERFORM apply_pending_referral(NEW.id, NEW.referral_source);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_wallet ON profiles;
CREATE TRIGGER on_profile_created_wallet
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_wallet();

-- ════════════════════════════════════════════════════════════════
-- 6. award_booking_milestone_credits — first-paid-booking rewards,
--    scoped to cab bookings (the only category with a local/outstation
--    split in this schema). Service-role only (called post-payment-verify).
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION award_booking_milestone_credits(p_booking_id UUID) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_listing_type listing_type;
  v_payment_status payment_status;
  v_booking_source TEXT;
  v_category TEXT;
  v_is_first BOOLEAN;
  v_welcome_amount NUMERIC;
  v_welcome_type wallet_transaction_type;
  v_referral_amount NUMERIC;
  v_referral_type wallet_transaction_type;
  v_referral_row RECORD;
  v_enabled BOOLEAN;
BEGIN
  SELECT b.user_id, b.listing_type, b.payment_status
  INTO v_user_id, v_listing_type, v_payment_status
  FROM bookings b WHERE b.id = p_booking_id;

  IF NOT FOUND OR v_payment_status <> 'completed' OR v_listing_type <> 'cab' THEN
    RETURN;
  END IF;

  SELECT program_enabled INTO v_enabled FROM wallet_settings LIMIT 1;
  IF NOT COALESCE(v_enabled, false) THEN
    RETURN;
  END IF;

  SELECT cb.booking_source INTO v_booking_source FROM cab_bookings cb WHERE cb.booking_id = p_booking_id;
  v_category := CASE WHEN v_booking_source = 'outstation_cab' THEN 'outstation' ELSE 'local' END;

  -- ── Welcome (rider) milestone: this user's first paid booking in this category ──
  SELECT NOT EXISTS (
    SELECT 1
    FROM bookings b2
    JOIN cab_bookings cb2 ON cb2.booking_id = b2.id
    WHERE b2.user_id = v_user_id
      AND b2.id <> p_booking_id
      AND b2.payment_status = 'completed'
      AND b2.listing_type = 'cab'
      AND (CASE WHEN cb2.booking_source = 'outstation_cab' THEN 'outstation' ELSE 'local' END) = v_category
  ) INTO v_is_first;

  IF v_is_first THEN
    IF v_category = 'outstation' THEN
      SELECT welcome_outstation_bonus INTO v_welcome_amount FROM wallet_settings LIMIT 1;
      v_welcome_type := 'welcome_outstation_booking';
    ELSE
      SELECT welcome_local_bonus INTO v_welcome_amount FROM wallet_settings LIMIT 1;
      v_welcome_type := 'welcome_local_booking';
    END IF;

    IF v_welcome_amount > 0 THEN
      PERFORM process_wallet_transaction(
        v_user_id, v_welcome_type, v_welcome_amount, 'booking_milestone', p_booking_id::TEXT,
        (CASE WHEN v_category = 'outstation' THEN 'welcome_outstation:' ELSE 'welcome_local:' END) || v_user_id::TEXT
      );
    END IF;
  END IF;

  -- ── Referral (referrer) milestone: referee's first paid booking in this category ──
  SELECT * INTO v_referral_row FROM referrals WHERE referred_user_id = v_user_id AND status = 'completed' LIMIT 1;
  IF FOUND THEN
    IF v_category = 'outstation' THEN
      SELECT referral_outstation_bonus INTO v_referral_amount FROM wallet_settings LIMIT 1;
      v_referral_type := 'referral_outstation_booking';
    ELSE
      SELECT referral_local_bonus INTO v_referral_amount FROM wallet_settings LIMIT 1;
      v_referral_type := 'referral_local_booking';
    END IF;

    IF v_referral_amount > 0 THEN
      PERFORM process_wallet_transaction(
        v_referral_row.referrer_id, v_referral_type, v_referral_amount, 'referral_system', p_booking_id::TEXT,
        (CASE WHEN v_category = 'outstation' THEN 'ref_outstation:' ELSE 'ref_local:' END) || v_referral_row.id::TEXT
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION award_booking_milestone_credits(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION award_booking_milestone_credits(UUID) TO service_role;

-- ════════════════════════════════════════════════════════════════
-- 7. redeem_wing_credits_for_booking — server-validated redemption.
--    Looks up the real booking value itself (never trusts a client-
--    supplied booking value), enforces ownership + paid status +
--    the 10% max-redemption rule. Service-role only.
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION redeem_wing_credits_for_booking(
  p_user_id UUID,
  p_booking_id UUID,
  p_amount NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_booking_value NUMERIC;
  v_max_pct NUMERIC;
  v_max_amount NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT total_price INTO v_booking_value
  FROM bookings
  WHERE id = p_booking_id AND user_id = p_user_id AND payment_status = 'completed';

  IF v_booking_value IS NULL THEN
    RAISE EXCEPTION 'Booking % not found, not owned by user %, or not paid', p_booking_id, p_user_id;
  END IF;

  SELECT max_redemption_percentage INTO v_max_pct FROM wallet_settings LIMIT 1;
  v_max_amount := ROUND(v_booking_value * COALESCE(v_max_pct, 10) / 100, 2);

  IF p_amount > v_max_amount THEN
    RAISE EXCEPTION 'Redemption amount % exceeds max allowed % (% percent of booking value %)',
      p_amount, v_max_amount, v_max_pct, v_booking_value;
  END IF;

  RETURN process_wallet_transaction(
    p_user_id, 'booking_redemption', -p_amount, 'booking_checkout', p_booking_id::TEXT,
    'booking_redemption:' || p_booking_id::TEXT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION redeem_wing_credits_for_booking(UUID, UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_wing_credits_for_booking(UUID, UUID, NUMERIC) TO service_role;

-- Package-booking variant: same server-side validation, looks up package_bookings
-- instead of bookings (verify-package-payment previously deducted whatever
-- used_wing_credits the client sent with no booking-value cap check at all).
CREATE OR REPLACE FUNCTION redeem_wing_credits_for_package_booking(
  p_user_id UUID,
  p_booking_id UUID,
  p_amount NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_booking_value NUMERIC;
  v_max_pct NUMERIC;
  v_max_amount NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT total_amount INTO v_booking_value
  FROM package_bookings
  WHERE id = p_booking_id AND user_id = p_user_id AND payment_status = 'completed';

  IF v_booking_value IS NULL THEN
    RAISE EXCEPTION 'Package booking % not found, not owned by user %, or not paid', p_booking_id, p_user_id;
  END IF;

  SELECT max_redemption_percentage INTO v_max_pct FROM wallet_settings LIMIT 1;
  v_max_amount := ROUND(v_booking_value * COALESCE(v_max_pct, 10) / 100, 2);

  IF p_amount > v_max_amount THEN
    RAISE EXCEPTION 'Redemption amount % exceeds max allowed % (% percent of booking value %)',
      p_amount, v_max_amount, v_max_pct, v_booking_value;
  END IF;

  RETURN process_wallet_transaction(
    p_user_id, 'booking_redemption', -p_amount, 'booking_checkout', p_booking_id::TEXT,
    'package_booking_redemption:' || p_booking_id::TEXT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION redeem_wing_credits_for_package_booking(UUID, UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION redeem_wing_credits_for_package_booking(UUID, UUID, NUMERIC) TO service_role;

-- ════════════════════════════════════════════════════════════════
-- 8. reverse_booking_credits — dormant refund-reversal helper.
--    Not wired to any trigger/webhook (none exists in this app yet).
--    Restores redeemed lots (preserving original expiry dates) and
--    reverses any welcome/referral booking-milestone rewards tied to
--    this booking. Service-role only.
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION reverse_booking_credits(p_booking_id UUID) RETURNS VOID AS $$
DECLARE
  v_redemption_tx RECORD;
  v_clc RECORD;
  v_wallet_id UUID;
  v_total_restored NUMERIC := 0;
  v_reward_tx RECORD;
  v_reward_user_id UUID;
BEGIN
  SELECT wt.* INTO v_redemption_tx
  FROM wallet_transactions wt
  WHERE wt.type = 'booking_redemption' AND wt.reference_id = p_booking_id
  LIMIT 1;

  IF FOUND THEN
    v_wallet_id := v_redemption_tx.wallet_id;

    FOR v_clc IN
      SELECT * FROM credit_lot_consumption WHERE consumption_transaction_id = v_redemption_tx.id
    LOOP
      DELETE FROM credit_lot_consumption WHERE id = v_clc.id;
      v_total_restored := v_total_restored + v_clc.amount;
    END LOOP;

    IF v_total_restored > 0 THEN
      UPDATE wallets
      SET balance = balance + v_total_restored,
          lifetime_redeemed = GREATEST(lifetime_redeemed - v_total_restored, 0),
          updated_at = NOW()
      WHERE id = v_wallet_id;

      INSERT INTO wallet_transactions (wallet_id, type, amount, status, source, reference_id, idempotency_key)
      VALUES (v_wallet_id, 'admin_credit', v_total_restored, 'completed', 'refund_reversal', p_booking_id,
              'refund_restore:' || p_booking_id::TEXT)
      ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
  END IF;

  FOR v_reward_tx IN
    SELECT * FROM wallet_transactions
    WHERE reference_id = p_booking_id
      AND type IN ('welcome_local_booking', 'welcome_outstation_booking',
                    'referral_local_booking', 'referral_outstation_booking')
  LOOP
    SELECT user_id INTO v_reward_user_id FROM wallets WHERE id = v_reward_tx.wallet_id;
    PERFORM process_wallet_transaction(
      v_reward_user_id, v_reward_tx.type, -v_reward_tx.amount, 'refund_reversal', p_booking_id::TEXT,
      v_reward_tx.idempotency_key || ':reversed'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION reverse_booking_credits(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reverse_booking_credits(UUID) TO service_role;

-- ════════════════════════════════════════════════════════════════
-- 9. wallet_lot_remaining — accurate per-lot remaining balance,
--    used by expire-wallet-credits instead of expiring a lot's full
--    original amount regardless of how much of it was already spent.
-- ════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW wallet_lot_remaining AS
SELECT
  wt.id AS lot_transaction_id,
  wt.wallet_id,
  w.user_id,
  wt.type,
  wt.amount,
  wt.expiry_date,
  wt.amount - COALESCE((
    SELECT SUM(clc.amount) FROM credit_lot_consumption clc WHERE clc.lot_transaction_id = wt.id
  ), 0) AS remaining
FROM wallet_transactions wt
JOIN wallets w ON w.id = wt.wallet_id
WHERE wt.status = 'completed' AND wt.amount > 0;

REVOKE ALL ON wallet_lot_remaining FROM PUBLIC;
GRANT SELECT ON wallet_lot_remaining TO service_role;

-- ════════════════════════════════════════════════════════════════
-- 10. Backfill: give every existing earning transaction an idempotency
--     key so future re-runs of historical data can't double-process it.
-- ════════════════════════════════════════════════════════════════
UPDATE wallet_transactions wt
SET idempotency_key = 'legacy_signup:' || wt.id::TEXT
WHERE wt.type = 'signup_bonus' AND wt.idempotency_key IS NULL;

UPDATE wallet_transactions wt
SET idempotency_key = 'legacy_referral:' || wt.id::TEXT
WHERE wt.type = 'referral_reward' AND wt.idempotency_key IS NULL;

-- ════════════════════════════════════════════════════════════════
-- 11. Close a pre-existing RLS gap: "Admins can manage wallets" was a
--     FOR ALL policy (no FOR clause defaults to ALL), letting an admin
--     UPDATE/INSERT/DELETE wallets.balance directly via PostgREST,
--     completely bypassing the ledger and breaking the append-only
--     invariant. Replaced with SELECT-only — admin balance changes must
--     go through admin_adjust_wallet() -> process_wallet_transaction()
--     so every change is ledgered.
-- ════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Admins can manage wallets" ON wallets;
CREATE POLICY "Admins can view all wallets" ON wallets FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
