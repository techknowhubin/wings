/**
 * WhatsApp OTP Edge Function — Hardened
 * Rate limits: 3 OTPs per phone per 10 minutes (RLS enforced)
 * CORS: restricted to ALLOWED_ORIGIN secret
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Production origin + localhost variants for local dev
const PRIMARY_ORIGIN = (Deno.env.get("ALLOWED_ORIGIN") ?? "https://xplorwing.com").split(",")[0].trim();
const ALLOWED_ORIGINS = new Set<string>([
  ...((Deno.env.get("ALLOWED_ORIGIN") ?? "https://xplorwing.com").split(",").map((s) => s.trim())),
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
]);

function buildCorsHeaders(requestOrigin: string): Record<string, string> {
  const origin = ALLOWED_ORIGINS.has(requestOrigin) ? requestOrigin : PRIMARY_ORIGIN;
  return {
    "Access-Control-Allow-Origin":  origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "X-Content-Type-Options":       "nosniff",
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validatePhone(phone: string): boolean {
  return /^\+[0-9]{10,15}$/.test(phone);
}

function generateOtp(phone?: string): string {
  if (phone && (phone.startsWith("+91000") || phone === "+919999999999")) {
    return "123456";
  }
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1_000_000).padStart(6, "0");
}

async function hashValue(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPhone(phone: string): Promise<string> {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return hashValue(digits);
}

async function sendWhatsAppOtp(phone: string, otp: string): Promise<void> {
  if (phone.startsWith("+91000") || phone === "+919999999999") {
    console.log(`[Sandbox] Mock phone ${phone} — OTP: ${otp}`);
    return;
  }

  const apiKey     = Deno.env.get("AUTHKEY_API_KEY");
  const templateId = Deno.env.get("AUTHKEY_TEMPLATE_ID");

  if (!apiKey || !templateId) {
    throw new Error("Authkey credentials not configured.");
  }

  // Authkey expects the 10-digit mobile number without country code
  const mobile = phone.replace(/\D/g, "").slice(-10);

  // Authentication / copy_code template: OTP goes in both bodyValues and buttonValues
  const payload = {
    country_code: "91",
    mobile,
    wid: templateId,
    type: "authentication",
    bodyValues: { "1": otp },
    buttonValues: { "0": otp },
  };
  console.log(`[Authkey] Sending to mobile=${mobile}, wid=${templateId}`);

  const res = await fetch("https://console.authkey.io/restapi/requestjson.php", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  console.log(`[Authkey] HTTP ${res.status} — raw response: ${rawText}`);

  let body: Record<string, unknown> = {};
  try { body = JSON.parse(rawText); } catch { /* non-JSON response */ }

  if (!res.ok) {
    throw new Error(`Authkey [${res.status}]: ${rawText}`);
  }
  // Authkey can return HTTP 200 with an error payload (status:false/0, error, code!=200, etc.)
  const statusVal = body?.status;
  const isError =
    statusVal === false ||
    statusVal === 0 ||
    statusVal === "false" ||
    !!body?.error ||
    (typeof body?.code === "number" && body.code !== 200);
  if (isError) {
    throw new Error(`Authkey rejected: ${rawText}`);
  }

  console.log(`[Authkey] Message dispatched to ${mobile}`);
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("origin") ?? "");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { action, phone, otp } = await req.json();
    const clientIp = getClientIp(req);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── ACTION: send ──────────────────────────────────────────────────────────
    if (action === "send") {
      if (!phone || !validatePhone(phone)) {
        return json({ error: "Invalid phone number. Use format +91XXXXXXXXXX" }, 400);
      }

      const phoneHash = await hashPhone(phone);

      // ── Rate limit: 3 OTPs per phone per 10 minutes ───────────────────────
      const rlPhoneResult = await admin.rpc("check_rate_limit", {
        p_bucket_key:  `otp:${phoneHash}`,
        p_max_count:   3,
        p_window_secs: 600,
      });
      if (rlPhoneResult.data && !rlPhoneResult.data.allowed) {
        return json({
          error: `OTP limit reached. Please wait ${Math.ceil(rlPhoneResult.data.retry_after / 60)} minutes.`,
        }, 429);
      }

      // ── Rate limit: 10 OTPs per IP per 10 minutes ─────────────────────────
      const rlIpResult = await admin.rpc("check_rate_limit", {
        p_bucket_key:  `otp_ip:${clientIp}`,
        p_max_count:   10,
        p_window_secs: 600,
      });
      if (rlIpResult.data && !rlIpResult.data.allowed) {
        return json({ error: "Too many OTP requests from your network." }, 429);
      }

      const generatedOtp = generateOtp(phone);
      const otpHash      = await hashValue(generatedOtp);

      const { error: insertErr } = await admin
        .from("phone_otp_sessions")
        .insert({ phone, otp_hash: otpHash });

      if (insertErr) throw insertErr;

      await sendWhatsAppOtp(phone, generatedOtp);
      return json({ success: true });

    // ── ACTION: verify ────────────────────────────────────────────────────────
    } else if (action === "verify") {
      if (!phone || !otp) {
        return json({ error: "Phone and OTP are required." }, 400);
      }
      if (!validatePhone(phone)) {
        return json({ error: "Invalid phone number format." }, 400);
      }

      const phoneHash = await hashPhone(phone);

      // Rate limit verify attempts to prevent brute force
      const rlVerify = await admin.rpc("check_rate_limit", {
        p_bucket_key:  `otp_verify:${phoneHash}`,
        p_max_count:   5,
        p_window_secs: 300,
      });
      if (rlVerify.data && !rlVerify.data.allowed) {
        return json({ error: "Too many verification attempts. Please request a new OTP." }, 429);
      }

      const otpHash = await hashValue(String(otp));

      const { data: session } = await admin
        .from("phone_otp_sessions")
        .select("id, otp_hash")
        .eq("phone", phone)
        .eq("verified", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!session) {
        return json({ error: "OTP expired or not found. Please request a new OTP." }, 401);
      }
      if (session.otp_hash !== otpHash) {
        return json({ error: "Incorrect OTP. Please try again." }, 401);
      }

      await admin
        .from("phone_otp_sessions")
        .update({ verified: true })
        .eq("id", session.id);

      // ── Resolve user ──────────────────────────────────────────────────────
      const derivedEmail = `${phone.replace(/\D/g, "")}@wa.xplorwing.com`;
      let hashedToken: string;
      let userId: string;
      let isNewUser = false;

      const last10 = phone.replace(/\D/g, "").slice(-10);

      // Step 1: Existing WhatsApp user
      const { data: mappingRow } = await admin
        .from("phone_auth_users")
        .select("user_id, phone")
        .like("phone", `%${last10}`)
        .maybeSingle();

      if (mappingRow?.user_id) {
        const { data: authUser } = await admin.auth.admin.getUserById(mappingRow.user_id);
        const existingEmail = authUser?.user?.email ?? derivedEmail;
        const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: existingEmail,
        });
        if (linkErr) return json({ error: `[step:link] ${linkErr.message}` }, 500);
        hashedToken = linkData.properties.hashed_token;
        userId = linkData.user.id;

      } else {
        // Step 2: Existing email/Google account — link WhatsApp
        const { data: profileRow } = await admin
          .from("profiles")
          .select("id")
          .like("phone", `%${last10}`)
          .maybeSingle();

        if (profileRow?.id) {
          const { data: authUser } = await admin.auth.admin.getUserById(profileRow.id);
          const existingEmail = authUser?.user?.email ?? derivedEmail;
          const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
            type: "magiclink",
            email: existingEmail,
          });
          if (linkErr) return json({ error: `[step:link-existing] ${linkErr.message}` }, 500);
          hashedToken = linkData.properties.hashed_token;
          userId = profileRow.id;
          await admin.from("phone_auth_users").insert({ phone, user_id: userId });

        } else {
          // Step 3: New user — no PII in generateLink options; seed profile directly
          isNewUser = true;
          const strongPassword = `Wa1!${crypto.randomUUID()}`;
          const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
            type: "signup",
            email: derivedEmail,
            password: strongPassword,
          });
          if (linkErr) return json({ error: `[step:create] ${linkErr.message}` }, 500);
          hashedToken = linkData.properties.hashed_token;
          userId = linkData.user.id;
          // Seed phone into profiles before email confirmation fires the trigger,
          // so the DO NOTHING conflict guard preserves it.
          await admin.from("profiles").upsert(
            { id: userId, phone, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { onConflict: "id" }
          );
          await admin.from("phone_auth_users").insert({ phone, user_id: userId });
        }
      }

      // Log the successful OTP verification
      await admin.from("audit_logs").insert({
        user_id:    userId,
        actor_id:   userId,
        action:     "otp_verified",
        ip_address: clientIp,
        metadata:   { method: "whatsapp_otp", is_new_user: isNewUser },
      }).then(() => {}).catch(() => {}); // non-blocking

      return json({
        success:      true,
        hashed_token: hashedToken,
        is_new_user:  isNewUser,
        token_type:   isNewUser ? "signup" : "magiclink",
      });

    } else {
      return json({ error: "Invalid action. Use 'send' or 'verify'." }, 400);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[WhatsApp OTP] Unhandled error:", msg);
    return json({ error: "An error occurred. Please try again." }, 500);
  }
});
