-- ============================================================
-- Phase 2: Rate Limiting & DoS Protection
-- ============================================================

-- ─── Rate limit events table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id           bigserial    PRIMARY KEY,
  bucket_key   text         NOT NULL,  -- e.g. "otp:+91XXXXXXXXXX" or "login:ip:1.2.3.4"
  created_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rle_bucket_created
  ON public.rate_limit_events (bucket_key, created_at DESC);

-- Auto-prune rows older than 24 hours to keep the table small
CREATE OR REPLACE FUNCTION public.prune_rate_limit_events()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.rate_limit_events WHERE created_at < now() - interval '24 hours';
END;
$$;

-- ─── Blocked IPs / identifiers ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limit_blocks (
  id           bigserial    PRIMARY KEY,
  bucket_key   text         NOT NULL UNIQUE,
  blocked_at   timestamptz  NOT NULL DEFAULT now(),
  unblock_at   timestamptz  NOT NULL,
  reason       text,
  block_count  integer      NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_rlb_key ON public.rate_limit_blocks (bucket_key);
CREATE INDEX IF NOT EXISTS idx_rlb_unblock ON public.rate_limit_blocks (unblock_at);

-- ─── Login attempt tracking ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id           bigserial    PRIMARY KEY,
  identifier   text         NOT NULL,  -- hashed email or phone
  ip_address   text,
  success      boolean      NOT NULL DEFAULT false,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_la_identifier_created
  ON public.login_attempts (identifier, created_at DESC);

-- ─── Device fingerprint sessions ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid         REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint     text         NOT NULL,
  ip_address      text,
  user_agent      text,
  first_seen_at   timestamptz  NOT NULL DEFAULT now(),
  last_seen_at    timestamptz  NOT NULL DEFAULT now(),
  is_trusted      boolean      NOT NULL DEFAULT false,
  suspicious_score integer     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_df_fingerprint ON public.device_fingerprints (fingerprint);
CREATE INDEX IF NOT EXISTS idx_df_user_id ON public.device_fingerprints (user_id);

-- ─── RLS: these tables are service-role only ─────────────────
ALTER TABLE public.rate_limit_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_blocks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_fingerprints  ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated access — only service role (edge functions) reads/writes these
-- Admins can view for monitoring
DROP POLICY IF EXISTS "Admins can view rate limit events" ON public.rate_limit_events;
CREATE POLICY "Admins can view rate limit events"
  ON public.rate_limit_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view rate limit blocks" ON public.rate_limit_blocks;
CREATE POLICY "Admins can view rate limit blocks"
  ON public.rate_limit_blocks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage blocks" ON public.rate_limit_blocks;
CREATE POLICY "Admins can manage blocks"
  ON public.rate_limit_blocks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view login attempts" ON public.login_attempts;
CREATE POLICY "Admins can view login attempts"
  ON public.login_attempts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users view own fingerprints" ON public.device_fingerprints;
CREATE POLICY "Users view own fingerprints"
  ON public.device_fingerprints FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins view all fingerprints" ON public.device_fingerprints;
CREATE POLICY "Admins view all fingerprints"
  ON public.device_fingerprints FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ─── Core rate-check function (used by edge functions via RPC) ─
-- Returns: (allowed boolean, retry_after_seconds int)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket_key  text,
  p_max_count   integer,
  p_window_secs integer
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_window_start  timestamptz;
  v_count         integer;
  v_block         public.rate_limit_blocks%ROWTYPE;
  v_retry_after   integer;
BEGIN
  v_window_start := now() - make_interval(secs => p_window_secs);

  -- Check if currently blocked
  SELECT * INTO v_block
  FROM public.rate_limit_blocks
  WHERE bucket_key = p_bucket_key
    AND unblock_at > now();

  IF FOUND THEN
    v_retry_after := EXTRACT(EPOCH FROM (v_block.unblock_at - now()))::integer;
    RETURN jsonb_build_object('allowed', false, 'retry_after', v_retry_after, 'blocked', true);
  END IF;

  -- Count events in window
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_events
  WHERE bucket_key = p_bucket_key
    AND created_at >= v_window_start;

  IF v_count >= p_max_count THEN
    -- Auto-block: exponential backoff based on existing block count
    INSERT INTO public.rate_limit_blocks (bucket_key, unblock_at, reason, block_count)
    VALUES (
      p_bucket_key,
      now() + make_interval(secs => LEAST(3600, p_window_secs * POWER(2, 1)::integer)),
      'rate_limit_exceeded',
      1
    )
    ON CONFLICT (bucket_key) DO UPDATE
      SET block_count = rate_limit_blocks.block_count + 1,
          unblock_at  = now() + make_interval(secs =>
            LEAST(86400, p_window_secs * POWER(2, rate_limit_blocks.block_count + 1)::integer)
          ),
          blocked_at  = now();

    v_retry_after := p_window_secs;
    RETURN jsonb_build_object('allowed', false, 'retry_after', v_retry_after, 'blocked', false);
  END IF;

  -- Record this event
  INSERT INTO public.rate_limit_events (bucket_key) VALUES (p_bucket_key);

  RETURN jsonb_build_object('allowed', true, 'retry_after', 0, 'blocked', false);
END;
$$;

-- ─── Unblock function for admins ─────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_unblock_rate_limit(p_bucket_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM public.rate_limit_blocks WHERE bucket_key = p_bucket_key;
  DELETE FROM public.rate_limit_events WHERE bucket_key = p_bucket_key;
END;
$$;

-- ─── Failed login counter ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_identifier text,
  p_ip_address text,
  p_success    boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_window_start  timestamptz;
  v_fail_count    integer;
  v_block_key     text;
BEGIN
  v_window_start := now() - interval '15 minutes';
  v_block_key    := 'login:' || p_identifier;

  INSERT INTO public.login_attempts (identifier, ip_address, success)
  VALUES (p_identifier, p_ip_address, p_success);

  IF NOT p_success THEN
    SELECT COUNT(*) INTO v_fail_count
    FROM public.login_attempts
    WHERE identifier    = p_identifier
      AND success       = false
      AND created_at   >= v_window_start;

    IF v_fail_count >= 5 THEN
      INSERT INTO public.rate_limit_blocks (bucket_key, unblock_at, reason)
      VALUES (v_block_key, now() + interval '15 minutes', 'failed_login_lockout')
      ON CONFLICT (bucket_key) DO UPDATE
        SET block_count = rate_limit_blocks.block_count + 1,
            unblock_at  = now() + interval '30 minutes',
            blocked_at  = now();
      RETURN jsonb_build_object('locked', true, 'retry_after', 900);
    END IF;
  END IF;

  RETURN jsonb_build_object('locked', false, 'fail_count', v_fail_count);
END;
$$;
