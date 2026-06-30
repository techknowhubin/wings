import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;
const DEV_MODE_ENABLED = import.meta.env.VITE_DEV_MODE === "true";

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
    let data: any = null;
    let error: any = null;
    try {
      const response = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount, currency, receipt },
      });
      data = response.data;
      error = response.error;
    } catch (invokeError) {
      error = invokeError;
    }

    if (error || !data?.id) {
      if (DEV_MODE_ENABLED) {
        console.warn(
          "Razorpay Edge Function failed or keys not set up. Falling back to sandbox simulation mode (dev only).",
          error || data,
        );
        const confirmMock = window.confirm(
          `[TEST MODE] Razorpay Edge Function failed or keys not configured.\n\n` +
          `Do you want to simulate a successful payment of ${currency} ${amount}?`,
        );

        if (confirmMock) {
          toast.success("Test Payment simulated successfully!");
          onSuccess?.({
            razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(2, 11)}`,
            razorpay_order_id: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
            razorpay_signature: `sig_mock_${Math.random().toString(36).substring(2, 11)}`,
          });
          return;
        }

        toast.info("Test Payment cancelled");
        onFailure?.(new Error("User cancelled simulated payment"));
        return;
      }

      const paymentInitError = new Error("Unable to initialize Razorpay order.");
      console.error("Razorpay order creation failed:", error || data);
      toast.error("Payment gateway unavailable. Please try again shortly.");
      onFailure?.(paymentInitError);
      return;
    }

    // Track whether onFailure has already been called by payment.failed event
    // to avoid double-calling when the modal is also dismissed after a failure
    let failureCalled = false;

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: data.amount,
      currency: data.currency,
      name: "Xplorwing",
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
          if (!failureCalled) {
            failureCalled = true;
            toast.info("Payment cancelled");
            onFailure?.(new Error("Payment cancelled by user"));
          }
        },
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on("payment.failed", (resp: any) => {
      failureCalled = true;
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
