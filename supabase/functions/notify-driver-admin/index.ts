const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { name, mobile, location } = await req.json();

    const apiKey = Deno.env.get("AISENSY_API_KEY");
    const campaignName = Deno.env.get("AISENSY_DRIVER_NOTIFY_CAMPAIGN");

    if (!apiKey || !campaignName) {
      console.warn("[notify-driver-admin] AiSensy env vars not set — skipping");
      return json({ ok: true, skipped: true });
    }

    const res = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        campaignName,
        destination: "916362986420",
        userName: "Xplorwing",
        templateParams: [name, mobile, location],
        source: "driver-registration",
        media: {},
        buttons: [],
        carouselCards: [],
        location: {},
        attributes: {},
        paramsFallbackValue: { FirstName: "Admin" },
      }),
    });

    const body = await res.json().catch(() => ({}));
    console.log("[notify-driver-admin] AiSensy →", res.status, body);

    return json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[notify-driver-admin] Error:", msg);
    return json({ ok: true }); // fail open — don't block the form submission
  }
});
