import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateOtp(): string {
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

async function sendWhatsAppOtp(phone: string, otp: string): Promise<void> {
  const apiKey = Deno.env.get("AISENSY_API_KEY");
  const campaignName = Deno.env.get("AISENSY_CAMPAIGN_NAME");

  if (!apiKey || !campaignName) {
    throw new Error("AiSensy credentials not configured in secrets.");
  }

  const destination = phone.replace(/^\+/, "");

  const res = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      campaignName,
      destination,
      userName: "Xplorwing",
      templateParams: [otp],
      source: "xplorwing-auth",
      media: {},
      buttons: [
        {
          type: "button",
          sub_type: "url",
          index: 0,
          parameters: [{ type: "text", text: otp }],
        },
      ],
      carouselCards: [],
      location: {},
      attributes: {},
      paramsFallbackValue: { FirstName: "User" },
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`AiSensy [${res.status}]: ${JSON.stringify(body)}`);
  }
  console.log("[AiSensy] OTP sent to", destination, "→", body);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
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

    // Admin client — service role, bypasses RLS
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── ACTION: send ──────────────────────────────────────────────────────────
    if (action === "send") {
      if (!phone || !/^\+\d{10,15}$/.test(phone)) {
        return json({ error: "Invalid phone number. Use format +91XXXXXXXXXX" }, 400);
      }

      // Rate limit: 1 OTP per 60 seconds
      const since = new Date(Date.now() - 60_000).toISOString();
      const { data: recent } = await admin
        .from("phone_otp_sessions")
        .select("id")
        .eq("phone", phone)
        .gte("created_at", since)
        .limit(1);

      if (recent && recent.length > 0) {
        return json({ error: "Please wait 60 seconds before requesting a new OTP." }, 429);
      }

      const generatedOtp = generateOtp();
      const otpHash = await hashValue(generatedOtp);

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

      const otpHash = await hashValue(String(otp));
      console.log("[verify] phone:", phone, "otp len:", String(otp).length);

      // Find valid, unused OTP session
      const { data: session, error: sessionErr } = await admin
        .from("phone_otp_sessions")
        .select("id, otp_hash")
        .eq("phone", phone)
        .eq("verified", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("[verify] session found:", !!session, "err:", sessionErr?.message ?? "none");

      if (!session) {
        return json({ error: "[step:lookup] OTP expired or not found. Please request a new OTP." }, 401);
      }
      if (session.otp_hash !== otpHash) {
        return json({ error: "[step:hash] Incorrect OTP. Please try again." }, 401);
      }

      // Mark OTP as used
      await admin
        .from("phone_otp_sessions")
        .update({ verified: true })
        .eq("id", session.id);

      // ── Resolve user — 3-step lookup to prevent duplicate accounts ───────
      const derivedEmail = `${phone.replace(/\D/g, "")}@wa.xplorwing.com`;

      let hashedToken: string;
      let userId: string;
      let isNewUser = false;

      // Step 1: Check phone_auth_users (previous WhatsApp login) — match by last 10 digits
      const phoneDigits10 = phone.replace(/\D/g, "").slice(-10);
      const { data: mappingRow } = await admin
        .from("phone_auth_users")
        .select("user_id, phone")
        .like("phone", `%${phoneDigits10}`)
        .maybeSingle();

      console.log("[verify] phone_auth_users match:", mappingRow?.user_id ?? "none");

      if (mappingRow?.user_id) {
        // ── Returning WhatsApp user ───────────────────────────────────────
        // Find their email to generate the magic link
        const { data: authUser } = await admin.auth.admin.getUserById(mappingRow.user_id);
        const existingEmail = authUser?.user?.email ?? derivedEmail;

        const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: existingEmail,
        });
        if (linkErr) {
          console.error("[verify:magiclink]", linkErr.message);
          return json({ error: `[step:link] ${linkErr.message}` }, 500);
        }
        hashedToken = linkData.properties.hashed_token;
        userId = linkData.user.id;

      } else {
        // Step 2: Check profiles.phone — match by last 10 digits to handle format mismatches
        // (profile may store "6362986420" while WhatsApp sends "+916362986420")
        const last10 = phone.replace(/\D/g, "").slice(-10);
        const { data: profileRow } = await admin
          .from("profiles")
          .select("id")
          .like("phone", `%${last10}`)
          .maybeSingle();

        console.log("[verify] profiles.phone match:", profileRow?.id ?? "none");

        if (profileRow?.id) {
          // ── Existing account (email/Google) — link WhatsApp to it ────────
          const { data: authUser } = await admin.auth.admin.getUserById(profileRow.id);
          const existingEmail = authUser?.user?.email ?? derivedEmail;

          const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
            type: "magiclink",
            email: existingEmail,
          });
          if (linkErr) {
            console.error("[verify:existing-magiclink]", linkErr.message);
            return json({ error: `[step:link-existing] ${linkErr.message}` }, 500);
          }
          hashedToken = linkData.properties.hashed_token;
          userId = profileRow.id;

          // Register the phone → user_id mapping so future WhatsApp logins are instant
          await admin
            .from("phone_auth_users")
            .insert({ phone, user_id: userId });

          console.log("[verify] linked WhatsApp phone to existing account:", existingEmail);

        } else {
          // Step 3: Brand-new user — create via signup link
          isNewUser = true;
          const strongPassword = `Wa1!${crypto.randomUUID()}`;
          const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
            type: "signup",
            email: derivedEmail,
            password: strongPassword,
            options: {
              data: { phone, phone_provider: "whatsapp" },
            },
          });
          if (linkErr) {
            console.error("[verify:signup-link]", linkErr.message);
            return json({ error: `[step:create] ${linkErr.message}` }, 500);
          }
          hashedToken = linkData.properties.hashed_token;
          userId = linkData.user.id;

          // Store phone → user mapping for future logins
          await admin
            .from("phone_auth_users")
            .insert({ phone, user_id: userId });
        }
      }

      console.log("[verify] ✅ hashed_token generated for user:", userId, "| isNewUser:", isNewUser);
      return json({
        success: true,
        hashed_token: hashedToken,
        is_new_user: isNewUser,
        token_type: isNewUser ? "signup" : "magiclink",
      });

    } else {
      return json({ error: "Invalid action. Use 'send' or 'verify'." }, 400);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[WhatsApp OTP] Unhandled error:", msg);
    return json({ error: msg }, 500);
  }
});
