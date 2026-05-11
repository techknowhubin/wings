import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

interface RazorpayOptions {
  amount: number; // in INR (rupees, not paise)
  currency?: string;
  title: string;
  description?: string;
  receipt?: string;
  onSuccess?: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  onFailure?: (error: unknown) => void;
  prefill?: { name?: string; email?: string; contact?: string };
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function initiateRazorpayPayment({
  amount,
  currency = "INR",
  title,
  description,
  receipt,
  onSuccess,
  onFailure,
  prefill,
}: RazorpayOptions) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    toast.error("Failed to load payment gateway. Please try again.");
    return;
  }

  try {
    // Create order via edge function
    const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
      body: { amount, currency, receipt },
    });

    if (error || !data?.id) {
      console.error("Razorpay Edge Function Failed. Ensure RAZORPAY_KEY_SECRET is configured in your Supabase project secrets.", error || data);
      throw new Error(error?.message || "Failed to create order. Check backend secrets.");
    }

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: data.amount,
      currency: data.currency,
      name: "WingsNNests",
      description: description || title,
      order_id: data.id,
      handler: (response: any) => {
        toast.success("Payment successful!");
        onSuccess?.(response);
      },
      prefill: prefill || {},
      theme: { color: "#013220" },
      modal: {
        ondismiss: () => {
          toast.info("Payment cancelled");
        },
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on("payment.failed", (resp: any) => {
      toast.error("Payment failed. Please try again.");
      onFailure?.(resp.error);
    });
    rzp.open();
  } catch (err) {
    console.error("Razorpay error:", err);
    toast.error("Could not initiate payment. Please try again.");
    onFailure?.(err);
  }
}
