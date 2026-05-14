import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ZEPTO_MAIL_API_KEY = Deno.env.get("ZEPTO_MAIL_API_KEY");
const ZEPTO_MAIL_SENDER_EMAIL = "hello@xplorwing.com"; // Replace with your verified sender email
const ZEPTO_MAIL_SENDER_NAME = "Xplorwing";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    console.log(`Sending newsletter welcome to ${email}`);

    // Call Zepto Mail API
    const response = await fetch("https://api.zeptomail.in/v1.1/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "Authorization": `Zoho-enczpt ${ZEPTO_MAIL_API_KEY}`,
      },
      body: JSON.stringify({
        from: {
          address: ZEPTO_MAIL_SENDER_EMAIL,
          name: ZEPTO_MAIL_SENDER_NAME,
        },
        to: [
          {
            email_address: {
              address: email,
            },
          },
        ],
        subject: "Welcome to Xplorwing Newsletter! 🦅",
        htmlbody: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #064e3b;">Welcome to Xplorwing!</h1>
            <p>Hi there,</p>
            <p>Thank you for joining our newsletter. We're excited to have you on board!</p>
            <p>Get ready for:</p>
            <ul>
              <li>Exclusive travel guides to India's hidden gems.</li>
              <li>Early access to new homestays and experiences.</li>
              <li>Special discounts for our community members.</li>
            </ul>
            <p>Stay tuned for our upcoming updates.</p>
            <p>Happy Exploring,<br><strong>The Xplorwing Team</strong></p>
            <hr style="margin-top: 30px; border: 0; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #666; text-align: center;">
              © 2026 Xplorwing. All rights reserved. <br/>
              Serving across India.
            </p>
          </div>
        `,
      }),
    });

    const result = await response.json();
    console.log("Zepto Mail Result:", result);

    if (!response.ok) {
      throw new Error(result.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in send-newsletter-welcome:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
