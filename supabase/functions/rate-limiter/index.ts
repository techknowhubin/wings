/**
 * Rate Limiter Edge Function
 * Provides enterprise-grade rate limiting for all Xplorwing APIs.
 *
 * Buckets:
 *   otp:<phone>          → 3 per 10 minutes
 *   login:<identifier>   → 5 per 15 minutes
 *   sensitive:<ip>       → 30 per 60 seconds (max 1/s)
 *   public:<ip>          → 5 per second
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://xplorwing.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forwarded-for",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Rate limit presets ───────────────────────────────────────
const PRESETS: Record<string, { max: number; windowSecs: number }> = {
  login:          { max: 5,  windowSecs: 60    },   // 5 per minute per identifier/IP
  registration:   { max: 3,  windowSecs: 60    },   // 3 per minute per IP/identifier
  password_reset: { max: 3,  windowSecs: 3600  },   // 3 per hour per IP/identifier
  admin:          { max: 50, windowSecs: 60    },   // 50 per minute per IP/identifier
  otp:            { max: 3,  windowSecs: 600   },   // 3 per 10 min per phone
  sensitive:      { max: 30, windowSecs: 60    },   // 30 per min per IP
  public:         { max: 5,  windowSecs: 1     },   // 5 per second per IP
  scrape:         { max: 60, windowSecs: 60    },   // 60 per min (anti-scraping)
};

function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { type, identifier } = await req.json();
    const ip = getClientIp(req);

    if (!type || !PRESETS[type]) {
      return json({ error: "Invalid rate limit type" }, 400);
    }

    const preset = PRESETS[type];

    // For IP-based checks, use IP; for phone/user-based, use identifier
    const bucketKey = identifier
      ? `${type}:${identifier}`
      : `${type}:ip:${ip}`;

    const { data, error } = await admin.rpc("check_rate_limit", {
      p_bucket_key:  bucketKey,
      p_max_count:   preset.max,
      p_window_secs: preset.windowSecs,
    });

    if (error) throw error;

    if (!data.allowed) {
      return json(
        {
          allowed: false,
          retry_after: data.retry_after,
          blocked: data.blocked,
          message: data.blocked
            ? `Too many requests. You are temporarily blocked. Try again in ${Math.ceil(data.retry_after / 60)} minutes.`
            : `Rate limit exceeded. Please wait ${data.retry_after} seconds.`,
        },
        429
      );
    }

    return json({ allowed: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[rate-limiter]", msg);
    return json({ error: "Internal server error" }, 500);
  }
});
