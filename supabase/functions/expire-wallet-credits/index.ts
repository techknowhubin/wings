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

    // 1. Find all completed earning transactions that have expired, 
    //    and haven't already been expired.
    // We check this by seeing if there is an 'expired_credits' transaction with reference_id = this transaction.id.
    const { data: expiredEarns, error: fetchErr } = await supabase
      .from("wallet_transactions")
      .select("id, wallet_id, amount, wallets(user_id, balance)")
      .in("type", ["signup_bonus", "referral_reward", "promotional_credits", "admin_credit"])
      .eq("status", "completed")
      .lt("expiry_date", new Date().toISOString())
      // Ideally we would do a complex join, but for simplicity we fetch and then filter or use a view.
      // Since this is a simple job, let's just fetch them and check.
      .limit(100);

    if (fetchErr) throw fetchErr;

    const processedIds = [];

    for (const tx of (expiredEarns || [])) {
      // Check if already expired
      const { data: alreadyExpired } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("type", "expired_credits")
        .eq("reference_id", tx.id)
        .maybeSingle();

      if (alreadyExpired) continue;

      const userId = tx.wallets?.user_id;
      const currentBalance = Number(tx.wallets?.balance || 0);

      // How much to expire? At most the transaction amount, but no more than the current wallet balance.
      const amountToExpire = Math.min(Number(tx.amount), currentBalance);

      if (amountToExpire > 0) {
        // Deduct from wallet
        const { error: deductErr } = await supabase.rpc("process_wallet_transaction", {
          p_user_id: userId,
          p_type: "expired_credits",
          p_amount: -amountToExpire,
          p_source: "system_cron",
          p_reference_id: tx.id,
        });

        if (deductErr) {
          console.error(`Failed to expire credits for tx ${tx.id}:`, deductErr);
          continue;
        }

        // Add a notification
        await supabase.rpc('create_notification', {
          p_user_id: userId,
          p_type: 'wallet_expired',
          p_title: 'Wing Credits Expired',
          p_message: `Your ${amountToExpire} Wing Credits have expired.`,
          p_action_link: '/profile/wing-credits'
        });
      } else {
        // If balance is 0, just create a 0 amount transaction to mark it processed
        await supabase.from("wallet_transactions").insert({
          wallet_id: tx.wallet_id,
          type: "expired_credits",
          amount: 0,
          status: "completed",
          source: "system_cron",
          reference_id: tx.id
        });
      }

      processedIds.push(tx.id);
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
