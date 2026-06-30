-- Wing Credits v2: idempotency, booking-milestone reward streams, FIFO lot consumption,
-- provider-agnostic referral application, server-validated redemption.
-- Retrofits the existing wallets/wallet_transactions/referrals/wallet_settings system
-- (no table renames — keeps WalletSection.tsx / AdminWalletManagement.tsx / checkout working).

-- ════════════════════════════════════════════════════════════════
-- 1. Idempotency key on the ledger
-- ════════════════════════════════════════════════════════════════
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_idempotency_key_uq
  ON wallet_transactions (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ════════════════════════════════════════════════════════════════
-- 2. New reward-stream transaction types
-- ════════════════════════════════════════════════════════════════
ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'welcome_local_booking';
ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'welcome_outstation_booking';
ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'referral_local_booking';
ALTER TYPE wallet_transaction_type ADD VALUE IF NOT EXISTS 'referral_outstation_booking';

-- NOTE: Postgres forbids using a freshly-added enum value within the same transaction
-- it was added in. All functions/views that reference the four values above live in
-- the follow-up migration 20260702100001_wing_credits_v2_functions.sql.

-- ════════════════════════════════════════════════════════════════
-- 3. wallet_settings: per-stream configurable amounts (spec defaults)
-- ════════════════════════════════════════════════════════════════
ALTER TABLE wallet_settings
  ADD COLUMN IF NOT EXISTS welcome_local_bonus       NUMERIC(10, 2) DEFAULT 200.00,
  ADD COLUMN IF NOT EXISTS welcome_outstation_bonus  NUMERIC(10, 2) DEFAULT 500.00,
  ADD COLUMN IF NOT EXISTS referral_local_bonus      NUMERIC(10, 2) DEFAULT 300.00,
  ADD COLUMN IF NOT EXISTS referral_outstation_bonus NUMERIC(10, 2) DEFAULT 500.00;

-- Switch production to the spec amounts for the two existing streams
-- (welcome signup: was 1000 -> 300; referral signup: was 500 -> 200)
UPDATE wallet_settings SET
  signup_bonus   = 300.00,
  referral_bonus = 200.00,
  welcome_local_bonus       = COALESCE(welcome_local_bonus, 200.00),
  welcome_outstation_bonus  = COALESCE(welcome_outstation_bonus, 500.00),
  referral_local_bonus      = COALESCE(referral_local_bonus, 300.00),
  referral_outstation_bonus = COALESCE(referral_outstation_bonus, 500.00);

-- ════════════════════════════════════════════════════════════════
-- 4. credit_lot_consumption: FIFO ledger linking debits to the
--    specific earning "lots" (transactions) they drew down.
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS credit_lot_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_transaction_id         UUID NOT NULL REFERENCES wallet_transactions(id) ON DELETE CASCADE,
  consumption_transaction_id UUID NOT NULL REFERENCES wallet_transactions(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clc_lot_tx ON credit_lot_consumption(lot_transaction_id);
CREATE INDEX IF NOT EXISTS idx_clc_consumption_tx ON credit_lot_consumption(consumption_transaction_id);

ALTER TABLE credit_lot_consumption ENABLE ROW LEVEL SECURITY;

-- Read-only for the owning user (via the lot's wallet); all writes are SECURITY DEFINER only.
DROP POLICY IF EXISTS "Users can view own lot consumption" ON credit_lot_consumption;
CREATE POLICY "Users can view own lot consumption" ON credit_lot_consumption FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM wallet_transactions wt
    JOIN wallets w ON w.id = wt.wallet_id
    WHERE wt.id = credit_lot_consumption.lot_transaction_id AND w.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Admins can view all lot consumption" ON credit_lot_consumption;
CREATE POLICY "Admins can view all lot consumption" ON credit_lot_consumption FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
