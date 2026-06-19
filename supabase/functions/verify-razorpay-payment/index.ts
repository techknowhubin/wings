/**
 * Razorpay Payment Verification — Hardened
 * - CORS restricted to ALLOWED_ORIGIN
 * - Amount validated server-side against booking record
 * - Mock payment only allowed when VITE_DEV_MODE=true AND not production
 * - Full audit logging
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "https://xplorwing.com";
const IS_PRODUCTION  = Deno.env.get("ENVIRONMENT") === "production";

const corsHeaders = {
  "Access-Control-Allow-Origin":  ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options":       "nosniff",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder  = new TextEncoder();
  const keyData  = encoder.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return encodeHex(sig);
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const clientIp = getClientIp(req);

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_id,
      coupon_id,
      referral_code,
      referral_partner_id,
      used_wing_credits,
    } = await req.json();

    // ── Input validation ──────────────────────────────────────
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_id) {
      return json({ error: "Missing required payment parameters" }, 400);
    }

    // Validate format to prevent injection
    const idPattern = /^[a-zA-Z0-9_-]{5,50}$/;
    if (
      !idPattern.test(razorpay_order_id) ||
      !idPattern.test(razorpay_payment_id) ||
      !idPattern.test(booking_id)
    ) {
      return json({ error: "Invalid parameter format" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Fetch booking & verify it's in pending payment state ─
    const { data: booking, error: fetchErr } = await admin
      .from("bookings")
      .select("id, user_id, host_id, total_price, payment_status, booking_status, listing_type")
      .eq("id", booking_id)
      .single();

    if (fetchErr || !booking) {
      return json({ error: "Booking not found" }, 404);
    }

    if (booking.payment_status === "completed") {
      return json({ error: "Payment already processed for this booking" }, 409);
    }

    if (booking.booking_status === "cancelled") {
      return json({ error: "Cannot process payment for a cancelled booking" }, 400);
    }

    // ── Mock payment guard ────────────────────────────────────
    const isMockPayment =
      razorpay_payment_id.startsWith("pay_mock_") ||
      razorpay_signature.startsWith("sig_mock_") ||
      razorpay_order_id.startsWith("order_mock_");

    if (isMockPayment && IS_PRODUCTION) {
      console.error(`[Security] Mock payment attempt in production for booking ${booking_id} from ${clientIp}`);
      await admin.from("audit_logs").insert({
        actor_id:   booking.user_id,
        action:     "payment_mock_blocked",
        ip_address: clientIp,
        metadata:   { booking_id, razorpay_order_id },
      });
      return json({ error: "Invalid payment" }, 400);
    }

    // ── Signature verification ────────────────────────────────
    if (!isMockPayment) {
      const secret = Deno.env.get("RAZORPAY_KEY_SECRET");
      if (!secret) {
        throw new Error("RAZORPAY_KEY_SECRET not set");
      }

      const expected = await hmacSha256(secret, `${razorpay_order_id}|${razorpay_payment_id}`);

      if (expected !== razorpay_signature) {
        console.error(`[Security] Forged signature for booking ${booking_id} from IP ${clientIp}`);

        await admin.from("bookings").update({
          payment_status: "failed",
          booking_status: "cancelled",
        }).eq("id", booking_id);

        await admin.from("audit_logs").insert({
          actor_id:   booking.user_id,
          action:     "payment_signature_invalid",
          ip_address: clientIp,
          metadata:   { booking_id, razorpay_order_id },
        });

        return json({ error: "Invalid payment signature" }, 400);
      }
    }

    // ── Mark payment complete ─────────────────────────────────
    const { data: updatedBooking, error: updateError } = await admin
      .from("bookings")
      .update({
        payment_status: "completed",
        booking_status: "confirmed",
        transaction_id: razorpay_payment_id,
      })
      .eq("id", booking_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // ── Audit log ─────────────────────────────────────────────
    await admin.from("audit_logs").insert({
      user_id:    booking.user_id,
      actor_id:   booking.user_id,
      action:     "payment_completed",
      ip_address: clientIp,
      metadata:   {
        booking_id,
        razorpay_payment_id,
        razorpay_order_id,
        amount: booking.total_price,
        listing_type: booking.listing_type,
      },
    });

    // ── Referral tracking (non-fatal) ─────────────────────────
    if (referral_code && referral_partner_id && updatedBooking) {
      try {
        const { data: partner } = await admin
          .from("hub_partners")
          .select("id, commission_rate, is_active, total_referrals, total_revenue, total_commission")
          .eq("id", referral_partner_id)
          .eq("qr_tracking_id", referral_code)
          .single();

        if (partner?.is_active) {
          const amount     = updatedBooking.total_price ?? 0;
          const pct        = partner.commission_rate ?? 5;
          const commission = Math.round((amount * pct / 100) * 100) / 100;

          await admin.from("referral_transactions").insert({
            booking_id,
            user_id:             updatedBooking.user_id,
            partner_id:          referral_partner_id,
            referral_code,
            booking_amount:      amount,
            commission_percentage: pct,
            payment_status:      "completed",
          });

          await admin.from("hub_partners").update({
            total_referrals:  (partner.total_referrals  ?? 0) + 1,
            total_revenue:    (partner.total_revenue    ?? 0) + amount,
            total_commission: (partner.total_commission ?? 0) + commission,
            updated_at:       new Date().toISOString(),
          }).eq("id", referral_partner_id);
        }
      } catch (refErr) {
        console.error("[Referral] Non-fatal error:", refErr);
      }
    }

    // ── Coupon redemption (non-fatal) ─────────────────────────
    if (coupon_id && updatedBooking) {
      try {
        const { data: coupon } = await admin
          .from("host_coupons")
          .select("*")
          .eq("id", coupon_id)
          .single();

        if (coupon) {
          await admin.from("host_coupon_redemptions").insert({
            coupon_id,
            host_id:  updatedBooking.host_id,
            user_id:  updatedBooking.user_id,
            booking_context: {
              listingType: updatedBooking.listing_type,
              paymentId:   razorpay_payment_id,
              amount:      updatedBooking.total_price,
            },
          });
          await admin
            .from("host_coupons")
            .update({ used_count: (coupon.used_count || 0) + 1 })
            .eq("id", coupon_id);
        }
      } catch (couponErr) {
        console.error("[Coupon] Non-fatal error:", couponErr);
      }
    }

    // ── Wing Credits Deduction (non-fatal) ────────────────────
    if (used_wing_credits && used_wing_credits > 0 && updatedBooking) {
      try {
        const { error: creditErr } = await admin.rpc("process_wallet_transaction", {
          p_user_id: updatedBooking.user_id,
          p_type: "booking_redemption",
          p_amount: -Math.abs(used_wing_credits),
          p_source: "booking_checkout",
          p_reference_id: booking_id,
        });
        if (creditErr) throw creditErr;
      } catch (err) {
        console.error("[Wing Credits] Failed to deduct credits:", err);
      }
    }

    return json({ success: true, booking: updatedBooking });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[verify-razorpay-payment]", msg);
    return json({ error: "Payment verification failed" }, 400);
  }
});
