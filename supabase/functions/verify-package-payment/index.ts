/**
 * verify-package-payment
 * Verifies Razorpay signature for package bookings and marks the booking confirmed.
 * Mirrors verify-razorpay-payment but targets package_bookings instead of bookings.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder   = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return encodeHex(sig);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_id,
      used_wing_credits,
      amount_paid,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_id) {
      return json({ error: "Missing required payment parameters" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch the pending package booking
    const { data: booking, error: fetchErr } = await admin
      .from("package_bookings")
      .select("id, user_id, package_id, total_amount, payment_status, booking_status")
      .eq("id", booking_id)
      .single();

    if (fetchErr || !booking) {
      return json({ error: "Booking not found" }, 404);
    }
    if (booking.payment_status === "completed") {
      return json({ error: "Payment already processed" }, 409);
    }
    if (booking.booking_status === "cancelled") {
      return json({ error: "Cannot process payment for a cancelled booking" }, 400);
    }

    // Verify Razorpay HMAC signature
    const IS_PRODUCTION = Deno.env.get("ENVIRONMENT") === "production";
    const isMock =
      razorpay_payment_id.startsWith("pay_mock_") ||
      razorpay_signature.startsWith("sig_mock_") ||
      razorpay_order_id.startsWith("order_mock_");

    if (isMock && IS_PRODUCTION) {
      return json({ error: "Invalid payment" }, 400);
    }

    if (!isMock) {
      const secret = Deno.env.get("RAZORPAY_KEY_SECRET");
      if (!secret) throw new Error("RAZORPAY_KEY_SECRET not configured");

      const expected = await hmacSha256(secret, `${razorpay_order_id}|${razorpay_payment_id}`);
      if (expected !== razorpay_signature) {
        const failureReason = "Payment verification failed: invalid signature";
        const now = new Date().toISOString();

        await admin.from("package_bookings").update({
          payment_status:        "failed",
          booking_status:        "failed",
          failure_reason:        failureReason,
          payment_attempted_at:  now,
          payment_failure_count: ((booking as any).payment_failure_count ?? 0) + 1,
        }).eq("id", booking_id);

        await admin.from("payment_attempts").insert({
          booking_id,
          booking_table:      "package_bookings",
          payment_gateway:    "razorpay",
          gateway_order_id:   razorpay_order_id,
          gateway_payment_id: razorpay_payment_id,
          amount:             booking.total_amount,
          status:             "failed",
          failure_reason:     failureReason,
          attempted_by:       booking.user_id,
        }).select().maybeSingle();

        await admin.from("notifications").insert({
          user_id: booking.user_id,
          type:    "payment",
          title:   "Payment Verification Failed",
          message: "Your package payment could not be verified. Please try again or contact support.",
          link:    "/profile/bookings",
        });

        return json({ error: "Invalid payment signature" }, 400);
      }
    }

    // Mark booking as confirmed
    const { data: updated, error: updateErr } = await admin
      .from("package_bookings")
      .update({
        payment_status:    "completed",
        booking_status:    "confirmed",
        payment_id:        razorpay_payment_id,
        amount_paid:       amount_paid ?? 0,
        wing_credits_used: used_wing_credits ?? 0,
      })
      .eq("id", booking_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Record successful payment attempt
    await admin.from("payment_attempts").insert({
      booking_id,
      booking_table:      "package_bookings",
      payment_gateway:    "razorpay",
      gateway_order_id:   razorpay_order_id,
      gateway_payment_id: razorpay_payment_id,
      amount:             booking.total_amount,
      status:             "success",
      attempted_by:       booking.user_id,
    }).select().maybeSingle();

    // Notify traveller of confirmed package booking
    await admin.from("notifications").insert({
      user_id: booking.user_id,
      type:    "booking",
      title:   "Package Booking Confirmed!",
      message: `Your package booking is confirmed and payment received. Booking ID: ${booking_id.slice(0, 8).toUpperCase()}`,
      link:    "/profile/bookings",
    });

    // Record payment in package_payments
    await admin.from("package_payments").insert({
      booking_id,
      amount:         booking.total_amount,
      payment_method: "Razorpay",
      transaction_id: razorpay_payment_id,
      status:         "completed",
    }).select().single();

    // Deduct Wing Credits atomically (non-fatal)
    if (used_wing_credits && used_wing_credits > 0) {
      try {
        await admin.rpc("process_wallet_transaction", {
          p_user_id:     booking.user_id,
          p_type:        "booking_redemption",
          p_amount:      -Math.abs(used_wing_credits),
          p_source:      "booking_checkout",
          p_reference_id: booking_id,
        });
      } catch (credErr) {
        console.error("[verify-package-payment] Wing credits deduction failed (non-fatal):", credErr);
      }
    }

    return json({ success: true, booking: updated });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[verify-package-payment]", msg);
    return json({ error: "Payment verification failed" }, 500);
  }
});
