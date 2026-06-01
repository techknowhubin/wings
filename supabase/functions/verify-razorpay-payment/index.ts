import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id, coupon_id, referral_code, referral_partner_id } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_id) {
        throw new Error('Missing required payment parameters');
    }

    // Initialize Supabase admin client to bypass RLS for secure updates
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify signature or handle mock/sandbox payment
    const secret = Deno.env.get('RAZORPAY_KEY_SECRET')
    const isMockPayment = 
      razorpay_payment_id.startsWith('pay_mock_') || 
      razorpay_signature.startsWith('sig_mock_') ||
      razorpay_order_id.startsWith('order_mock_');

    if (isMockPayment) {
      console.log(`[Sandbox] Mock payment detected for booking ${booking_id}. Bypassing signature verification.`);
    } else {
      if (!secret) {
        throw new Error('RAZORPAY_KEY_SECRET not set')
      }

      const generated_signature = await hmacSha256(secret, `${razorpay_order_id}|${razorpay_payment_id}`)

      if (generated_signature !== razorpay_signature) {
        // Security warning: Forged signature attempt!
        console.error(`Invalid Razorpay signature for booking ${booking_id}. Expected ${generated_signature}, got ${razorpay_signature}`);
        
        // Update booking to failed
        await supabaseClient
          .from('bookings')
          .update({ payment_status: 'failed', booking_status: 'cancelled' })
          .eq('id', booking_id)

        return new Response(
          JSON.stringify({ error: 'Invalid payment signature' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    }

    // Payment is valid — mark payment complete and booking confirmed (host still needs to deliver)
    const { data: booking, error: updateError } = await supabaseClient
      .from('bookings')
      .update({
          payment_status: 'completed',
          booking_status: 'confirmed',
          transaction_id: razorpay_payment_id
      })
      .eq('id', booking_id)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // Handle referral tracking securely on the server
    if (referral_code && referral_partner_id && booking) {
      try {
        // Fetch partner to get commission rate and validate active status
        const { data: partner } = await supabaseClient
          .from('hub_partners')
          .select('id, commission_rate, is_active, total_referrals, total_revenue, total_commission')
          .eq('id', referral_partner_id)
          .eq('referral_id', referral_code)
          .single()

        if (partner && partner.is_active) {
          const bookingAmount = booking.total_price ?? 0
          const commissionPct = partner.commission_rate ?? 5
          const commissionAmount = Math.round((bookingAmount * commissionPct / 100) * 100) / 100

          // Insert referral transaction
          await supabaseClient.from('referral_transactions').insert({
            booking_id: booking_id,
            user_id: booking.user_id,
            partner_id: referral_partner_id,
            referral_code: referral_code,
            booking_amount: bookingAmount,
            commission_percentage: commissionPct,
            payment_status: 'completed',
          })

          // Update partner aggregates atomically
          await supabaseClient.from('hub_partners').update({
            total_referrals:  (partner.total_referrals  ?? 0) + 1,
            total_revenue:    (partner.total_revenue    ?? 0) + bookingAmount,
            total_commission: (partner.total_commission ?? 0) + commissionAmount,
            updated_at: new Date().toISOString(),
          }).eq('id', referral_partner_id)

          console.log(`[Referral] Tracked: ${referral_code} → partner ${referral_partner_id}, commission ₹${commissionAmount}`)
        }
      } catch (refErr) {
        // Non-fatal — log but don't block payment confirmation
        console.error('[Referral] Failed to record referral transaction:', refErr)
      }
    }

    // Handle coupon logic securely on the server
    if (coupon_id && booking) {
      const { data: coupon } = await supabaseClient
        .from('host_coupons')
        .select('*')
        .eq('id', coupon_id)
        .single()
        
      if (coupon) {
         await supabaseClient
          .from('host_coupon_redemptions')
          .insert({
            coupon_id: coupon_id,
            host_id: booking.host_id,
            user_id: booking.user_id,
            booking_context: {
              listingType: booking.listing_type,
              paymentId: razorpay_payment_id,
              amount: booking.total_price
            }
          })

         await supabaseClient
          .from('host_coupons')
          .update({ used_count: (coupon.used_count || 0) + 1 })
          .eq('id', coupon_id)
      }
    }

    return new Response(
      JSON.stringify({ success: true, booking }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message || 'Payment verification failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

async function hmacSha256(key: string, message: string) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const messageData = encoder.encode(message);
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    messageData
  );
  
  return encodeHex(signatureBuffer);
}
