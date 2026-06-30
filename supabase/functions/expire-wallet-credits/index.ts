import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Find expired earning lots via wallet_lot_remaining, which accounts for
    //    how much of each lot has already been spent via FIFO consumption —
    //    unlike a raw wallet_transactions scan, this never over- or under-expires
    //    a lot that's been partially redeemed.
    const { data: expiredLots, error: fetchErr } = await supabase
      .from("wallet_lot_remaining")
      .select("lot_transaction_id, user_id, remaining, expiry_date")
      .lt("expiry_date", new Date().toISOString())
      .gt("remaining", 0)
      .limit(100);

    if (fetchErr) throw fetchErr;

    const processedIds = [];

    for (const lot of (expiredLots || [])) {
      // Check if already expired (idempotency_key is the primary guard; this is a fallback)
      const { data: alreadyExpired } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("type", "expired_credits")
        .eq("reference_id", lot.lot_transaction_id)
        .maybeSingle();

      if (alreadyExpired) continue;

      const amountToExpire = Number(lot.remaining);

      const { error: deductErr } = await supabase.rpc("process_wallet_transaction", {
        p_user_id: lot.user_id,
        p_type: "expired_credits",
        p_amount: -amountToExpire,
        p_source: "system_cron",
        p_reference_id: lot.lot_transaction_id,
        p_idempotency_key: `expire:${lot.lot_transaction_id}`,
      });

      if (deductErr) {
        console.error(`Failed to expire credits for lot ${lot.lot_transaction_id}:`, deductErr);
        continue;
      }

      await supabase.rpc('create_notification', {
        p_user_id: lot.user_id,
        p_type: 'wallet_expired',
        p_title: 'Wing Credits Expired',
        p_message: `Your ${amountToExpire} Wing Credits have expired.`,
        p_action_link: '/profile/wing-credits'
      });

      processedIds.push(lot.lot_transaction_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedIds.length} expired transactions.`,
        processed: processedIds
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
