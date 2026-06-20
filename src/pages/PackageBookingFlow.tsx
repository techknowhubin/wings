import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Wallet, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type BookingState = { selectedPackages: any[]; totalTravellers: number; grandTotal: number };

declare global {
  interface Window { Razorpay: any }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PackageBookingFlow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const initialized = useRef(false);

  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [step, setStep] = useState(1);
  const [travellers, setTravellers] = useState<{ name: string; age: string; gender: string; email?: string; mobile?: string }[]>([]);
  const [effectiveState, setEffectiveState] = useState<BookingState | null>(null);
  const [confirmedBookingRef, setConfirmedBookingRef] = useState('');

  const [walletBalance, setWalletBalance] = useState(0);
  const [useWingCredits, setUseWingCredits] = useState(false);

  const selectedPackages = effectiveState?.selectedPackages || [];
  const totalTravellers  = effectiveState?.totalTravellers || 1;
  const grandTotal       = effectiveState?.grandTotal || 0;

  // Credits: max 10% of available credit balance per booking
  const allowedCredits          = Math.round(walletBalance * 0.10 * 100) / 100;
  const wingCreditsDiscountAmount = useWingCredits ? Math.min(walletBalance, allowedCredits) : 0;
  const finalPayable            = Math.max(grandTotal - wingCreditsDiscountAmount, 0);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      // 1. Auth check
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const state = location.state as BookingState | null;
        if (state) {
          localStorage.setItem("pkg_booking_state", JSON.stringify({ packageId: id, ...state, ts: Date.now() }));
        }
        localStorage.setItem("intended_url", `/experiences/${id}/book`);
        navigate("/auth");
        return;
      }

      // 2. Resolve booking state from navigation or post-login localStorage
      let state = location.state as BookingState | null;
      if (!state) {
        const savedRaw = localStorage.getItem("pkg_booking_state");
        if (savedRaw) {
          try {
            const saved = JSON.parse(savedRaw);
            if (saved.packageId === id && Date.now() - saved.ts < 3_600_000) {
              state = { selectedPackages: saved.selectedPackages, totalTravellers: saved.totalTravellers, grandTotal: saved.grandTotal };
              localStorage.removeItem("pkg_booking_state");
            }
          } catch { /* ignore */ }
        }
      }

      if (!state) { navigate(`/experiences/${id}`); return; }
      setEffectiveState(state);

      // 3. Auto-fill primary traveller from user profile
      const { data: profile } = await supabase
        .from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();
      const mobile = profile?.phone?.replace(/^\+91/, "").trim() || "";
      setTravellers([
        { name: profile?.full_name || "", age: "", gender: "", email: user.email || "", mobile },
        ...Array.from({ length: state.totalTravellers - 1 }, () => ({ name: "", age: "", gender: "" }))
      ]);

      fetchPackage();
      fetchWallet(user.id);
    };

    init();
  }, [id]);

  const fetchWallet = async (userId: string) => {
    const { data } = await supabase.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
    if (data) setWalletBalance(Number(data.balance || 0));
  };

  const fetchPackage = async () => {
    if (!id) return;
    const { data } = await supabase.from("tour_packages").select("*").eq("id", id).single();
    setPkg(data);
    setLoading(false);
  };

  const updateTraveller = (index: number, field: string, value: string) => {
    const newT = [...travellers];
    newT[index] = { ...newT[index], [field]: value };
    setTravellers(newT);
  };

  const validateTravellers = (): boolean => {
    for (let i = 0; i < travellers.length; i++) {
      if (!travellers[i].name || !travellers[i].age || !travellers[i].gender) {
        toast.error(`Please complete all fields for Traveller ${i + 1}`);
        return false;
      }
      if (i === 0 && (!travellers[i].email || !travellers[i].mobile)) {
        toast.error("Please provide email and mobile number for Traveller 1");
        return false;
      }
    }
    return true;
  };

  const handlePay = async () => {
    if (!validateTravellers()) return;

    setPaying(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Session expired. Please log in again.");
        localStorage.setItem("intended_url", `/experiences/${id}/book`);
        navigate("/auth");
        return;
      }

      // Check capacity before proceeding
      if (pkg?.max_capacity) {
        const available = pkg.max_capacity - (pkg.booked_seats || 0);
        if (totalTravellers > available) {
          toast.error(`Only ${available} seat(s) available. You requested ${totalTravellers}.`);
          setPaying(false);
          return;
        }
      }

      const refId = `XP-PKG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Create booking in 'pending' state — hub_id auto-filled by DB trigger
      const { data: booking, error: bErr } = await supabase
        .from("package_bookings")
        .insert({
          booking_ref:    refId,
          package_id:     id,
          user_id:        userData.user.id,
          total_amount:   grandTotal,
          payment_status: "pending",
          booking_status: "pending",
          booking_details: selectedPackages,
        })
        .select()
        .single();

      if (bErr) throw bErr;
      console.log("[BookingFlow] Pending booking created:", booking.id, "hub_id:", booking.hub_id);

      // 2. Insert travellers (triggers booked_seats counter)
      const tData = travellers.map((t) => ({
        booking_id: booking.id,
        name:   t.name,
        age:    parseInt(t.age),
        gender: t.gender,
        email:  t.email  || null,
        mobile: t.mobile || null,
      }));
      const { error: tErr } = await supabase.from("package_travellers").insert(tData);
      if (tErr) throw tErr;

      // 3. Wing-credits-only path (finalPayable = 0)
      if (finalPayable === 0) {
        const { error: freeErr } = await supabase.functions.invoke("verify-package-payment", {
          body: {
            razorpay_order_id:   `order_mock_${Date.now()}`,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_signature:  `sig_mock_${Date.now()}`,
            booking_id:          booking.id,
            used_wing_credits:   wingCreditsDiscountAmount,
            amount_paid:         finalPayable,
          },
        });
        if (freeErr) throw new Error(freeErr.message || "Failed to confirm booking");
        setConfirmedBookingRef(refId);
        toast.success("Booking confirmed!");
        setStep(3);
        return;
      }

      // 4. Razorpay payment path
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Payment gateway failed to load. Please try again.");
        // Clean up the pending booking
        await supabase.from("package_bookings").update({ booking_status: "cancelled" }).eq("id", booking.id);
        return;
      }

      const { data: orderData, error: orderErr } = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: finalPayable, receipt: refId },
      });
      if (orderErr || orderData?.error) {
        throw new Error(orderData?.error || "Failed to create payment order");
      }

      const rzp = new window.Razorpay({
        key:         import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:      orderData.amount,
        currency:    orderData.currency,
        name:        "Xplorwing",
        description: `Booking: ${refId}`,
        order_id:    orderData.id,
        prefill: {
          name:    travellers[0]?.name,
          email:   travellers[0]?.email,
          contact: travellers[0]?.mobile,
        },
        theme:    { color: "#0c3b2e" },
        modal: {
          ondismiss: () => {
            toast.error("Payment cancelled. Your booking is saved as pending — you can retry.");
            setPaying(false);
          },
        },
        handler: async (response: any) => {
          console.log("[BookingFlow] Razorpay success:", response.razorpay_payment_id);
          try {
            const { error: verifyErr } = await supabase.functions.invoke("verify-package-payment", {
              body: {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                booking_id:          booking.id,
                used_wing_credits:   wingCreditsDiscountAmount,
                amount_paid:         finalPayable,
              },
            });
            if (verifyErr) throw new Error(verifyErr.message || "Payment verification failed");
            console.log("[BookingFlow] Booking confirmed:", refId);
            setConfirmedBookingRef(refId);
            toast.success("Booking confirmed! Payment received.");
            setStep(3);
          } catch (verifyError: any) {
            toast.error(verifyError.message || "Payment verified but booking update failed. Contact support.");
          } finally {
            setPaying(false);
          }
        },
      });

      rzp.open();
      // Note: setPaying(false) is called inside the handler or ondismiss

    } catch (err: any) {
      console.error("[BookingFlow] Payment flow error:", err);
      toast.error(err.message || "Failed to process payment");
      setPaying(false);
    }
  };

  if (loading && !pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />

      <div className="container mx-auto px-4 py-12 max-w-3xl flex-1">
        <h1 className="text-3xl font-bold mb-8">Book: {pkg?.name}</h1>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="bg-card p-6 md:p-8 rounded-2xl border border-border shadow-sm">

          {/* ── STEP 1: Traveller Information ─────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-8">
              <h2 className="text-xl font-bold">Step 1: Traveller Information</h2>
              {travellers.map((t, i) => (
                <div key={i} className="p-4 border border-border rounded-xl space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                    {i === 0 ? "Traveller 1 (Primary Contact)" : `Traveller ${i + 1}`}
                  </h3>

                  {i === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
                      <div className="space-y-2">
                        <Label>Email Address <span className="text-red-500">*</span></Label>
                        <Input type="email" value={t.email || ""} onChange={(e) => updateTraveller(i, "email", e.target.value)} placeholder="Enter email" />
                      </div>
                      <div className="space-y-2">
                        <Label>Mobile Number <span className="text-red-500">*</span></Label>
                        <Input type="tel" value={t.mobile || ""} onChange={(e) => updateTraveller(i, "mobile", e.target.value)} placeholder="Enter mobile number" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name <span className="text-red-500">*</span></Label>
                      <Input value={t.name} onChange={(e) => updateTraveller(i, "name", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Age <span className="text-red-500">*</span></Label>
                      <Input type="number" value={t.age} onChange={(e) => updateTraveller(i, "age", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender <span className="text-red-500">*</span></Label>
                      <Select value={t.gender} onValueChange={(v) => updateTraveller(i, "gender", v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => navigate(`/experiences/${id}`)}>Back to Package</Button>
                <Button onClick={() => setStep(2)} className="flex-1">Continue to Payment</Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Checkout ──────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground">Checkout Summary</h2>

              {/* Wing Credits */}
              {walletBalance > 0 && (
                <div className="bg-[#fcfdf7] border border-[#e8eed2] rounded-xl p-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Wallet className="h-5 w-5 text-[#c1d06e] mt-0.5" />
                    <div>
                      <p className="font-bold text-[#0c3b2e] text-lg mb-1">Wing Credits</p>
                      <p className="text-sm text-[#4a6b5d] mb-0.5">Available: ₹{walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                      <p className="text-sm text-[#4a6b5d]">You can apply up to 10% of your credits — ₹{allowedCredits.toLocaleString("en-IN", { minimumFractionDigits: 2 })} on this booking.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="use-wing-credits"
                      checked={useWingCredits}
                      onChange={(e) => setUseWingCredits(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[#0c3b2e] focus:ring-[#0c3b2e]"
                    />
                    <Label htmlFor="use-wing-credits" className="text-sm font-bold text-[#0c3b2e] cursor-pointer">Apply</Label>
                  </div>
                </div>
              )}

              {/* Capacity warning */}
              {pkg?.max_capacity && (pkg.booked_seats || 0) + totalTravellers > pkg.max_capacity && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">
                  ⚠ Only {Math.max(0, pkg.max_capacity - (pkg.booked_seats || 0))} seat(s) remaining — your selection exceeds availability.
                </div>
              )}

              {/* Receipt */}
              <div className="bg-white p-4 border-b border-t border-gray-100 space-y-3">
                <div className="flex justify-between text-[#4a6b5d]">
                  <span>Booking Amount</span>
                  <span className="font-semibold text-foreground">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {useWingCredits && wingCreditsDiscountAmount > 0 && (
                  <div className="flex justify-between text-[#115f10]">
                    <span>Wing Credits Used</span>
                    <span className="font-semibold">-₹{wingCreditsDiscountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 my-2" />
                <div className="flex justify-between items-center text-[#0c3b2e] pt-2">
                  <span className="font-bold">Amount to Pay</span>
                  <span className="text-2xl font-bold">₹{finalPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} disabled={paying}>
                  Back
                </Button>
                <Button
                  onClick={handlePay}
                  disabled={paying}
                  className="flex-1 h-14 text-lg font-bold bg-[#c1d06e] hover:bg-[#a8b85b] text-[#0c3b2e] rounded-xl shadow-md"
                >
                  {paying
                    ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Processing…</>
                    : finalPayable === 0
                      ? <><Wallet className="h-5 w-5 mr-2" /> Confirm Booking (Wing Credits)</>
                      : <><CreditCard className="h-5 w-5 mr-2" /> Pay ₹{finalPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</>
                  }
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Payments are secured by Razorpay.
              </p>
            </div>
          )}

          {/* ── STEP 3: Confirmation ─────────────────────────────────────── */}
          {step === 3 && (
            <div className="text-center py-12 space-y-6">
              <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold">Booking Confirmed!</h2>
              {confirmedBookingRef && (
                <p className="text-sm font-mono bg-muted rounded-lg px-4 py-2 inline-block">
                  Ref: {confirmedBookingRef}
                </p>
              )}
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Your booking for <strong>{pkg?.name}</strong> has been confirmed. You can view your itinerary and upload required documents in your dashboard.
              </p>
              <Button onClick={() => navigate("/profile")} className="mt-8">Go to Dashboard</Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
